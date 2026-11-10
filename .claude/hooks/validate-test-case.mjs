#!/usr/bin/env node
// PreToolUse-хук (matcher: Write|Edit): перевіряє формат тест-кейсу перед записом у test-cases/<module>/<ID>.md.
// Для Edit береться поточний вміст файлу з диска, застосовується old_string → new_string, і перевіряється повний результат.
// Код виходу 0 — дозволити запис; 2 — заблокувати, список помилок іде в stderr (його бачить Claude).
// Лише вбудовані модулі Node. Зміст кейсу відносно docs тут не перевіряється — це робота tc-verifier.

import fs from 'node:fs';
import path from 'node:path';

const MODULES = ['auth', 'pilots', 'aircraft', 'requests', 'review', 'gates', 'api'];
const ID_RE = /^(API|E2E)-(OP|RV|AN)(-(OP|RV|AN))?-\d{3}$/;
const DOCS = ['01-data-model.md', '02-state-machine.md', '03-api-contract.md', '04-frontend-spec.md',
  '05-open-questions.md', '06-business-rules.md', '07-clarifications.md', '08-uml-diagrams.md'];
// Сторінки Confluence (простір SD) для нового формату Doc ref: SD/<назва сторінки>#<розділ>.
const SD_PAGES = ['01 — Data Model', '02 — Request Lifecycle', '03 — API Contract', '04 — Frontend Scope',
  '05 — Open Questions', '06 — Business Rules', '07 — Clarifications', '08 — UML Diagrams'];
const GATES = ['PILOT', 'AIRCRAFT', 'ZONE', 'TIME_WINDOW'];
const FIELDS = ['Doc ref', 'Role(s)', 'Preconditions', 'Steps', 'Expected result', 'Rationale'];
const OPTIONAL = new Set(['Preconditions']);
const BANNED = ['коректно', 'успішно', 'як очікується'];
const MAX_STEPS = 5;

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

// Прибирає fenced-блоки та inline-код, щоб `<...>` у прикладах не вважався плейсхолдером.
const stripCode = s => s.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

function validate(norm, content, root) {
  const errors = [];

  // 1–2. Шлях і імʼя файлу
  const m = norm.match(/(?:^|\/)test-cases\/([^/]+)\/([^/]+)\.md$/);
  if (!m) return [`Шлях має бути test-cases/<module>/<ID>.md, отримано: ${norm}`];
  const [, module, id] = m;
  if (!MODULES.includes(module)) errors.push(`Модуль «${module}» не дозволений. Дозволені: ${MODULES.join(', ')}.`);
  if (!ID_RE.test(id)) errors.push(`ID «${id}» не відповідає формату <API|E2E>-<OP|RV|AN>[-<OP|RV|AN>]-NNN.`);

  // 4. Унікальність ID у всьому test-cases/
  // Свій модуль пропускаємо: файл за тим самим шляхом — це правка/перезапис того самого кейсу (Edit або Write).
  // Дубль в іншому модулі блокується завжди.
  const casesDir = path.join(root, 'test-cases');
  if (fs.existsSync(casesDir)) {
    for (const d of fs.readdirSync(casesDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      if (d.name === module) continue;
      if (fs.existsSync(path.join(casesDir, d.name, `${id}.md`))) {
        errors.push(`Кейс ${id} уже існує в test-cases/${d.name}/ — ID має бути унікальним у всьому test-cases/, візьми наступний номер.`);
      }
    }
  }

  const text = content.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  // 3. Заголовок
  const head = lines[0].match(/^# (\S+): (.+)$/);
  if (!head) errors.push('Перший рядок має бути «# <ID>: <заголовок>».');
  else if (head[1] !== id) errors.push(`ID у заголовку («${head[1]}») не збігається з імʼям файлу («${id}»).`);

  // 5–6. Поля: порядок, відсутність зайвих, непорожність
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const f = lines[i].match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (f) found.push({ name: f[1], line: i, inline: f[2] });
  }
  const sections = {};
  found.forEach((f, idx) => {
    const end = idx + 1 < found.length ? found[idx + 1].line : lines.length;
    const body = [f.inline, ...lines.slice(f.line + 1, end)].join('\n').trim();
    sections[f.name] = { body, rest: lines.slice(f.line + 1, end) };
  });
  for (const f of found) if (!FIELDS.includes(f.name)) errors.push(`Зайве поле «${f.name}» — нових полів шаблон не допускає.`);
  const known = found.map(f => f.name).filter(n => FIELDS.includes(n));
  for (const n of FIELDS) {
    if (!known.includes(n) && !OPTIONAL.has(n)) errors.push(`Немає обовʼязкового поля «${n}».`);
  }
  const expectedOrder = FIELDS.filter(n => known.includes(n));
  if (known.join('|') !== expectedOrder.join('|')) {
    errors.push(`Порядок полів має бути: ${FIELDS.join(' → ')}. Зараз: ${known.join(' → ')}.`);
  }
  for (const n of known) if (!sections[n].body) errors.push(`Поле «${n}» порожнє (для Preconditions — видали поле повністю).`);

  // 7. Doc ref
  // Приймаються обидва формати: старий `0N-назва.md#розділ` (наявні кейси)
  // і новий `SD/<назва сторінки>#<розділ>` (нові кейси).
  const docRef = sections['Doc ref'];
  if (docRef && docRef.body) {
    const refs = [...docRef.body.matchAll(/(0[1-8]-[a-z-]+\.md)#/g)].map(r => r[1]);
    const sdRefs = [...docRef.body.matchAll(/SD\/([^#`\n]+)#/g)].map(r => r[1].trim());
    if (!refs.length && !sdRefs.length) {
      errors.push('Doc ref: потрібне хоча б одне посилання у форматі `0N-назва.md#розділ` (наявні кейси) '
        + 'або `SD/<назва сторінки>#<розділ>` (нові кейси, напр. `SD/06 — Business Rules#1.4 TIME_WINDOW`).');
    }
    for (const r of refs) if (!DOCS.includes(r)) errors.push(`Doc ref: документа «${r}» немає серед 01–08.`);
    for (const p of sdRefs) {
      if (!SD_PAGES.includes(p)) errors.push(`Doc ref: сторінки «SD/${p}» немає серед 01–08 простору SD.`);
    }
  }

  // 8. Steps
  const steps = sections['Steps'];
  if (steps && steps.body) {
    const nums = steps.rest.map(l => l.match(/^(\d+)\.\s+\S/)).filter(Boolean).map(r => Number(r[1]));
    if (!nums.length) errors.push('Steps: кроки мають бути пронумеровані («1. …»).');
    else {
      if (nums.some((n, i) => n !== i + 1)) errors.push(`Steps: нумерація має йти 1, 2, 3… Зараз: ${nums.join(', ')}.`);
      if (nums.length > MAX_STEPS) errors.push(`Steps: ${nums.length} кроків, максимум ${MAX_STEPS}.`);
    }
  }

  // 9. Preconditions
  const pre = sections['Preconditions'];
  if (pre && pre.body && !pre.rest.some(l => /^- \S/.test(l))) {
    errors.push('Preconditions: потрібен хоча б один пункт списку («- …»), інакше видали поле.');
  }

  // 10. Заборонені формулювання в Expected result
  const exp = sections['Expected result'];
  if (exp && exp.body) {
    for (const w of BANNED) if (exp.body.toLowerCase().includes(w)) errors.push(`Expected result: слово «${w}» заборонене — опиши спостережуваний факт.`);

    // 12. failing_gate / rule_reference — для модулів gates та api
    if ((module === 'gates' || module === 'api') && /\b422\b/.test(exp.body)) {
      const g = exp.body.match(/failing_gate`?\s*(?:=|:)?\s*`?"?([A-Z_]+)/);
      if (!g || !GATES.includes(g[1])) errors.push(`Expected result (${module}, 422): вкажи failing_gate — одне з ${GATES.join(', ')}.`);
      if (!/rule_reference/.test(exp.body)) errors.push(`Expected result (${module}, 422): вкажи rule_reference.`);
      if (module === 'api' && !/\bmessage\b/.test(exp.body)) errors.push('Expected result (api, 422): вкажи message.');
    }
  }

  // 11. Невикористані плейсхолдери шаблону
  const ph = stripCode(text).match(/<[^<>\n]{1,80}>/g);
  if (ph) errors.push(`Лишились плейсхолдери: ${[...new Set(ph)].join(', ')}.`);

  // 13. Кирилиця (кейс українською)
  const rat = sections['Rationale'];
  if (!/[Ѐ-ӿ]/.test(rat ? rat.body : text)) errors.push('Rationale має бути українською (кирилиця не знайдена).');

  return errors;
}

// Повний текст файлу після Edit; null — якщо Edit не можна змоделювати (його відхилить сам інструмент).
function applyEdit(abs, oldStr, newStr, replaceAll) {
  if (typeof oldStr !== 'string' || typeof newStr !== 'string' || oldStr === '') return null;
  let cur;
  try { cur = fs.readFileSync(abs, 'utf8'); } catch { return null; }
  const parts = cur.split(oldStr);
  const count = parts.length - 1;
  if (count === 0 || (count > 1 && !replaceAll)) return null;
  if (replaceAll) return parts.join(newStr);
  const i = cur.indexOf(oldStr);
  return cur.slice(0, i) + newStr + cur.slice(i + oldStr.length);
}

async function main() {
  const input = JSON.parse((await readStdin()) || '{}');
  const tool = input.tool_name;
  if (tool !== 'Write' && tool !== 'Edit') return 0;
  const filePath = input.tool_input && input.tool_input.file_path;
  if (typeof filePath !== 'string') return 0;

  const norm = filePath.replace(/\\/g, '/');
  if (!/(?:^|\/)test-cases\//.test(norm) || !norm.endsWith('.md')) return 0;

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const isEdit = tool === 'Edit';
  let content;
  if (isEdit) {
    const ti = input.tool_input;
    content = applyEdit(path.resolve(input.cwd || root, filePath), ti.old_string, ti.new_string, ti.replace_all === true);
    if (content === null) return 0;
  } else {
    content = String(input.tool_input.content ?? '');
  }
  const errors = validate(norm, content, root);
  if (!errors.length) return 0;

  process.stderr.write(`Кейс не ${isEdit ? 'змінено' : 'записано'}: ${errors.length} помилок формату (${path.basename(norm)}). Виправ і ${isEdit ? 'повтори правку' : 'запиши файл знову'}:\n`
    + errors.map(e => `- ${e}`).join('\n') + '\n');
  return 2;
}

main().then(code => process.exit(code)).catch(err => {
  // Збій самого хуку не блокує роботу: попередження в stderr, код 0.
  process.stderr.write(`validate-test-case: ${err && err.stack || err}\n`);
  process.exit(0);
});
