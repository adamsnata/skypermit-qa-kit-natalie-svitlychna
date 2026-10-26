#!/usr/bin/env node
// Stop-хук: рахує моделі, контекст, токени й орієнтовну вартість сесії за transcript JSONL
// і пише Markdown-звіт у reports/ws2/<YYYY-MM-DD>-<session_id>.md.
// Спрацьовує після кожної відповіді, тому звіт для сесії щоразу перезаписується актуальним станом.
// Лише вбудовані модулі Node. Будь-яка помилка → stderr, код виходу завжди 0.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// Ціни в $ за 1M токенів. Модель зіставляється за підрядком у назві (claude-opus-5-5 → opus).
const PRICES = {
  haiku: { in: 0.10, out: 0.50 },
  sonnet: { in: 2, out: 10 },
  opus: { in: 4, out: 20 },
};
const CACHE_READ_FACTOR = 0.1; // читання кешу ≈ 1/10 ціни input
const CACHE_WRITE_FACTOR = 1;  // запис у кеш — за ціною input
const PROMPT_PREVIEW = 80;
const TOP_N = 3;

function priceFor(model) {
  const m = String(model || '').toLowerCase();
  for (const [key, p] of Object.entries(PRICES)) if (m.includes(key)) return p;
  return null;
}

function costOf(u, p) {
  if (!p) return null;
  return (u.input * p.in + u.cacheRead * p.in * CACHE_READ_FACTOR
    + u.cacheWrite * p.in * CACHE_WRITE_FACTOR + u.output * p.out) / 1e6;
}

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

// Построчний розбір: биті рядки пропускаємо й рахуємо.
async function readJsonl(file) {
  const records = [];
  let broken = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { records.push(JSON.parse(line)); } catch { broken++; }
  }
  return { records, broken };
}

// Текст промпту користувача або null, якщо запис — не промпт.
function promptText(rec, sidechain) {
  if (rec.type !== 'user' || rec.isMeta || rec.isCompactSummary) return null;
  if (!sidechain && rec.origin && rec.origin.kind !== 'human') return null;
  const c = rec.message && rec.message.content;
  let text;
  if (typeof c === 'string') text = c;
  else if (Array.isArray(c)) {
    if (c.some(b => b && b.type === 'tool_result')) return null;
    text = c.filter(b => b && b.type === 'text').map(b => b.text).join(' ');
  } else return null;
  text = text.replace(/<\/?pasted_content[^>]*>/g, '').trim();
  if (!text || text.startsWith('<local-command-')) return null;
  const cmd = text.match(/<command-name>([^<]*)<\/command-name>/);
  if (cmd) {
    const args = (text.match(/<command-args>([^<]*)<\/command-args>/) || [])[1] || '';
    text = `${cmd[1]} ${args}`.trim();
  }
  if (text === '/compact') return null;
  return text.replace(/\s+/g, ' ');
}

function emptyAgg() {
  return { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, unknown: false };
}

function addTo(agg, r) {
  agg.requests++;
  agg.input += r.input; agg.output += r.output;
  agg.cacheRead += r.cacheRead; agg.cacheWrite += r.cacheWrite;
  if (r.cost == null) agg.unknown = true; else agg.cost += r.cost;
}

// Унікальні API-запити файлу (дедуп за requestId), моменти /compact.
function extract(records, sidechain, seen) {
  const requests = [];
  const compacts = [];
  let lastPrompt = '';
  for (const rec of records) {
    const p = promptText(rec, sidechain);
    if (p != null) { lastPrompt = p; continue; }
    if (rec.type === 'system' && rec.subtype === 'compact_boundary') {
      const md = rec.compactMetadata || {};
      compacts.push({ ts: rec.timestamp, afterRequest: requests.length, trigger: md.trigger, pre: md.preTokens, post: md.postTokens });
      continue;
    }
    if (rec.type !== 'assistant' || !rec.message || !rec.message.usage) continue;
    const key = rec.requestId || rec.message.id;
    if (key) { if (seen.has(key)) continue; seen.add(key); }
    const u = rec.message.usage;
    const r = {
      model: rec.message.model || 'unknown',
      ts: rec.timestamp,
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      cacheWrite: u.cache_creation_input_tokens || 0,
      prompt: lastPrompt,
    };
    r.cost = costOf(r, priceFor(r.model));
    requests.push(r);
  }
  return { requests, compacts };
}

const fmtN = n => n.toLocaleString('uk-UA');
const fmt$ = (c, unknown) => unknown ? (c > 0 ? `≥ $${c.toFixed(4)} (є ціна невідома)` : 'ціна невідома') : `$${c.toFixed(4)}`;
const cacheShare = a => {
  const total = a.input + a.cacheRead + a.cacheWrite;
  return total ? `${(a.cacheRead / total * 100).toFixed(1)}%` : '—';
};
const fmtTs = ts => ts ? new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
const md = s => String(s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');

function aggRow(label, a) {
  return `| ${md(label)} | ${a.requests} | ${fmtN(a.input)} | ${fmtN(a.output)} | ${fmtN(a.cacheRead)} | ${fmtN(a.cacheWrite)} | ${cacheShare(a)} | ${fmt$(a.cost, a.unknown)} |`;
}

const TABLE_HEAD = '| Модель | Запити | Input | Output | Cache read | Cache write | Частка кешу | Вартість |\n|---|---:|---:|---:|---:|---:|---:|---:|';

async function main() {
  const raw = await readStdin();
  const input = JSON.parse(raw || '{}');
  const transcript = input.transcript_path;
  const sessionId = input.session_id || (transcript ? path.basename(transcript, '.jsonl') : 'unknown');
  if (!transcript) throw new Error('у stdin немає transcript_path');
  if (!fs.existsSync(transcript)) throw new Error(`transcript не знайдено: ${transcript}`);

  const seen = new Set();
  const main = await readJsonl(transcript);
  const mainData = extract(main.records, false, seen);
  let broken = main.broken;

  // Субагенти лежать поруч: <dir>/<session_id>/subagents/agent-*.jsonl (+ .meta.json).
  const subDir = path.join(path.dirname(transcript), path.basename(transcript, '.jsonl'), 'subagents');
  const subRequests = [];
  const subByType = new Map();
  let subFiles = 0;
  if (fs.existsSync(subDir)) {
    for (const f of fs.readdirSync(subDir).filter(f => f.endsWith('.jsonl')).sort()) {
      subFiles++;
      let agentType = 'unknown';
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(subDir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'));
        agentType = meta.agentType || agentType;
      } catch { /* meta необов'язковий */ }
      const sub = await readJsonl(path.join(subDir, f));
      broken += sub.broken;
      if (agentType === 'unknown') agentType = (sub.records.find(r => r.attributionAgent) || {}).attributionAgent || agentType;
      for (const r of extract(sub.records, true, seen).requests) {
        r.agent = agentType;
        subRequests.push(r);
        if (!subByType.has(agentType)) subByType.set(agentType, emptyAgg());
        addTo(subByType.get(agentType), r);
      }
    }
  }

  const all = [...mainData.requests, ...subRequests];
  const byModel = new Map();
  for (const r of all) {
    if (!byModel.has(r.model)) byModel.set(r.model, emptyAgg());
    addTo(byModel.get(r.model), r);
  }
  const total = emptyAgg();
  all.forEach(r => addTo(total, r));
  const subTotal = emptyAgg();
  subRequests.forEach(r => addTo(subTotal, r));

  // Останній cost-state — власна оцінка Claude Code (включно з фоновими викликами), лише для довідки.
  const costState = main.records.filter(r => r.type === 'cost-state').pop();

  const known = [...byModel].filter(([m]) => priceFor(m));
  const unknown = [...byModel].filter(([m]) => !priceFor(m));

  const out = [];
  const date = new Date().toISOString().slice(0, 10);
  out.push(`# Звіт про використання токенів — ${date}`, '');
  out.push(`- Сесія: \`${sessionId}\``);
  out.push(`- Transcript: \`${transcript}\``);
  out.push(`- API-запитів: ${total.requests} (основна сесія — ${mainData.requests.length}, субагенти — ${subRequests.length})`);
  out.push(`- Орієнтовна вартість: **${fmt$(total.cost, total.unknown)}**`);
  if (mainData.requests.length) {
    // Розмір контексту запиту = усе, що модель прочитала: input + cache read + cache write.
    const ctx = r => r.input + r.cacheRead + r.cacheWrite;
    const last = mainData.requests[mainData.requests.length - 1];
    const peak = mainData.requests.reduce((a, r) => ctx(r) > ctx(a) ? r : a);
    out.push(`- Контекст основної сесії: останній запит — ${fmtN(ctx(last))} токенів (${last.model}); максимум за сесію — ${fmtN(ctx(peak))}`);
  }
  if (broken) out.push(`- Пропущено пошкоджених рядків JSONL: ${broken}`);
  out.push('', '> ⚠ Суми — **оцінка, а не рахунок**: розраховано за таблицею цін у хуку, а не за даними білінгу.', '');

  out.push('## За моделями', '', TABLE_HEAD);
  for (const [m, a] of known) out.push(aggRow(m, a));
  for (const [m, a] of unknown) out.push(aggRow(`${m} (ціна невідома)`, a));
  out.push(aggRow('**Разом**', total), '');
  out.push(`Частка кешу = cache read / (input + cache read + cache write).`, '');

  out.push('## Субагенти', '');
  if (!subRequests.length) out.push(subFiles ? `Файлів субагентів: ${subFiles}, запитів у них немає.` : 'Субагентів у сесії не було.', '');
  else {
    out.push(`Субагенти (${subFiles} запусків): ${subTotal.requests} запитів, ${fmtN(subTotal.input + subTotal.output + subTotal.cacheRead + subTotal.cacheWrite)} токенів, ${fmt$(subTotal.cost, subTotal.unknown)}.`, '');
    out.push(TABLE_HEAD.replace('| Модель |', '| Тип агента |'));
    for (const [t, a] of subByType) out.push(aggRow(t, a));
    out.push('');
  }

  out.push('## Моменти /compact', '');
  if (!mainData.compacts.length) out.push('Стиснень контексту не було.', '');
  else {
    out.push('| # | Час | Після запиту № | Тригер | Токенів до → після |', '|---:|---|---:|---|---|');
    mainData.compacts.forEach((c, i) => out.push(
      `| ${i + 1} | ${fmtTs(c.ts)} | ${c.afterRequest} | ${c.trigger || '—'} | ${c.pre != null ? fmtN(c.pre) : '—'} → ${c.post != null ? fmtN(c.post) : '—'} |`));
    out.push('');
  }

  out.push(`## Топ-${TOP_N} найдорожчих запитів`, '');
  const top = all.filter(r => r.cost != null).sort((a, b) => b.cost - a.cost).slice(0, TOP_N);
  if (!top.length) out.push('Немає запитів із відомою ціною.', '');
  else {
    out.push('| # | Вартість | Модель | Час | Де | Промпт (перші 80 символів) |', '|---:|---:|---|---|---|---|');
    top.forEach((r, i) => {
      const p = r.prompt ? r.prompt.slice(0, PROMPT_PREVIEW) + (r.prompt.length > PROMPT_PREVIEW ? '…' : '') : '—';
      out.push(`| ${i + 1} | $${r.cost.toFixed(4)} | ${r.model} | ${fmtTs(r.ts)} | ${r.agent ? `субагент ${md(r.agent)}` : 'основна сесія'} | ${md(p)} |`);
    });
    out.push('');
  }

  out.push('## Примітки', '');
  out.push('- Враховано лише записи `assistant` з transcript; один API-запит рахується один раз (дедуп за `requestId`).');
  out.push('- Виклик, що генерує саммарі для /compact, і фонові виклики (наприклад, генерація заголовка) у transcript не потрапляють, тому тут не враховані.');
  if (costState && typeof costState.totalCostUSD === 'number') {
    out.push(`- Для довідки: остання власна оцінка Claude Code (\`cost-state\`) — $${costState.totalCostUSD.toFixed(4)}; вона включає й виклики, яких немає в transcript, тому може бути більшою.`);
  }
  out.push('- Промпт запиту — останній промпт користувача перед ним (для субагента — завдання, яке він отримав).');
  out.push(`- Ціни ($ за 1M токенів): ${Object.entries(PRICES).map(([k, p]) => `${k} in ${p.in} / out ${p.out}`).join('; ')}; cache read ×${CACHE_READ_FACTOR}, cache write ×${CACHE_WRITE_FACTOR} від input.`);

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const dir = path.join(root, 'reports', 'ws2');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${date}-${sessionId}.md`);
  fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
  process.stderr.write(`usage-report: звіт збережено в ${file}\n`);
}

main()
  .catch(err => process.stderr.write(`usage-report: ${err && err.stack || err}\n`))
  .finally(() => process.exit(0));
