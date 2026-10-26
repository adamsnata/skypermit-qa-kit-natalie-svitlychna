#!/usr/bin/env node
// Знаходить правила гейтів із 06-business-rules.md, для яких у test-cases/ ще немає кейсів.
// Без моделі: лише читання файлів. Результат — JSON у stdout, згрупований за гейтом.
// Використання: node scripts/uncovered-rules.mjs [--gate PILOT|AIRCRAFT|ZONE|TIME_WINDOW] [--limit N]
//           або: node scripts/uncovered-rules.mjs [N] [GATE]   (напр. «3 PILOT»; за замовчуванням N = 3)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES_DOC = path.join(ROOT, '..', 'skypermit', 'docs', '06-business-rules.md');
const CASES_DIR = path.join(ROOT, 'test-cases');
const GATES = ['PILOT', 'AIRCRAFT', 'ZONE', 'TIME_WINDOW'];

function fail(msg) {
  process.stderr.write(`uncovered-rules: ${msg}\n`);
  process.exit(1);
}

const DEFAULT_LIMIT = 3;

// Два режими: прапорці (--gate, --limit) або позиційні аргументи як у /cover-gaps
// («3 PILOT», порядок будь-який; без аргументів — DEFAULT_LIMIT правил з усіх гейтів).
function parseArgs(argv) {
  const opts = { gate: null, limit: null };
  const positional = !argv.some(a => a.startsWith('--'));
  if (positional) {
    for (const a of argv) {
      if (/^\d+$/.test(a) && opts.limit === null) opts.limit = Number(a);
      else if (GATES.includes(a.toUpperCase()) && !opts.gate) opts.gate = a.toUpperCase();
      else fail(`невідомий аргумент: ${a}. Формат: [максимум правил] [${GATES.join('|')}], напр. «3 PILOT»`);
    }
    if (opts.limit === null) opts.limit = DEFAULT_LIMIT;
  } else {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--gate') opts.gate = (argv[++i] || '').toUpperCase();
      else if (argv[i] === '--limit') opts.limit = Number(argv[++i]);
      else fail(`невідомий аргумент: ${argv[i]}`);
    }
  }
  if (opts.gate && !GATES.includes(opts.gate)) fail(`--gate має бути одним із: ${GATES.join(', ')}`);
  if (opts.limit !== null && !(Number.isInteger(opts.limit) && opts.limit > 0)) fail('--limit має бути цілим числом > 0');
  return opts;
}

const clean = s => s.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
const splitRow = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

// Таблиці з першою колонкою «Condition» у розділах «### 1.N `GATE`».
function parseRules(text) {
  const rules = [];
  const counters = {};
  let gate = null;
  let inRuleTable = false;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+1\.\d+\s+`?([A-Z_]+)`?/);
    if (h) { gate = GATES.includes(h[1]) ? h[1] : null; inRuleTable = false; continue; }
    if (/^#{1,3}\s/.test(line)) { gate = null; inRuleTable = false; continue; }
    if (!gate || !line.trim().startsWith('|')) { if (!line.trim().startsWith('|')) inRuleTable = false; continue; }
    const cells = splitRow(line);
    if (clean(cells[0]).toLowerCase() === 'condition') { inRuleTable = true; continue; }
    if (!inRuleTable || cells.every(c => /^:?-+:?$/.test(c))) continue;
    const sourceCell = cells[2] || '';
    const cite = clean(sourceCell).match(/([A-Z][A-Z0-9.-]*) §([\d.]+)/);
    counters[gate] = (counters[gate] || 0) + 1;
    rules.push({
      id: `${gate}-${String(counters[gate]).padStart(2, '0')}`,
      gate,
      title: clean(cells[0]),
      citation: cite ? `${cite[1]} §${cite[2]}` : null,
      // правило з непідтвердженим джерелом — не віддавати генератору як звичайне
      open: /not yet (fully )?confirmed/i.test(line),
    });
  }
  return rules;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.md') ? [p] : [];
  });
}

// Текст поля «Expected result» кейсу (до наступного поля або кінця файлу).
function expectedResult(text) {
  const m = text.replace(/\r\n/g, '\n').match(/\*\*Expected result:\*\*([\s\S]*?)(?=\n\*\*[^*\n]+:\*\*|$)/);
  return m ? m[1] : '';
}

// Кейс покриває правило, якщо в його Expected result є і цитата правила (rule_reference), і назва гейту (failing_gate).
// Згадки в Rationale чи Preconditions не враховуються.
function isCovered(rule, cases) {
  if (!rule.citation) return null;
  const cite = new RegExp(rule.citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![.\\d]*\\d)');
  const gate = new RegExp(`\\b${rule.gate}\\b`);
  const hit = cases.find(c => {
    const exp = expectedResult(c.text);
    return cite.test(exp) && gate.test(exp);
  });
  return hit ? hit.id : false;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(RULES_DOC)) fail(`немає файлу ${RULES_DOC}`);
  const rules = parseRules(fs.readFileSync(RULES_DOC, 'utf8'));
  if (!rules.length) fail('у 06-business-rules.md не знайдено жодного правила — змінився формат?');

  const cases = walk(CASES_DIR).map(f => ({ id: path.basename(f, '.md'), text: fs.readFileSync(f, 'utf8') }));

  const covered = [];
  let uncovered = [];
  for (const r of rules) {
    const by = isCovered(r, cases);
    if (by) covered.push({ ...r, covered_by: by });
    else uncovered.push(r);
  }
  const totalByGate = {};
  for (const r of rules) totalByGate[r.gate] = (totalByGate[r.gate] || 0) + 1;

  // Усі прогалини до фільтра за гейтом і обрізання за limit.
  const gapsTotal = uncovered.length;
  if (opts.gate) uncovered = uncovered.filter(r => r.gate === opts.gate);
  if (opts.limit) uncovered = uncovered.slice(0, opts.limit);

  const by_gate = {};
  for (const g of GATES) {
    if (opts.gate && g !== opts.gate) continue;
    by_gate[g] = uncovered.filter(r => r.gate === g);
  }

  process.stdout.write(JSON.stringify({
    total: rules.length,
    covered: covered.length,
    gaps_total: gapsTotal,
    uncovered: uncovered.length,
    filter: { gate: opts.gate, limit: opts.limit },
    total_by_gate: totalByGate,
    by_gate,
    covered_rules: covered,
  }, null, 2) + '\n');
}

main();
