# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a QA kit for the **skypermit** project, which lives at `../skypermit`. Claude's main job here is to write **manual test cases and test plans** from the specification in the Confluence space **SkyPermit Docs**. Writing automated tests is not part of the job unless the user asks for it.

Source specification — Confluence, space **SkyPermit Docs** (key `SD`, spaceId `294916`,
site `skypermitdocs.atlassian.net`, cloudId `04cfe3ba-ca1f-4d3c-8ff3-b67f1f3c5083`).
Читай через MCP-інструменти `mcp__atlassian__getConfluencePage` (за pageId),
`mcp__atlassian__searchConfluenceUsingCql`, `mcp__atlassian__getPagesInConfluenceSpace`:

| Сторінка | pageId |
|---|---|
| 01 — Data Model | 688129 |
| 02 — Request Lifecycle | 720897 |
| 03 — API Contract | 753665 |
| 04 — Frontend Scope | 786433 |
| 05 — Open Questions | 819201 |
| 06 — Business Rules | 851969 |
| 07 — Clarifications | 884737 |
| 08 — UML Diagrams | 917505 |

Confluence — **лише читання**: не викликай create/update/comment-інструменти Atlassian.
Формат Doc ref: `SD/<назва сторінки>#<розділ>`, напр. `SD/03 — API Contract#Authentication & authorisation`.
Наявні кейси зі старим форматом (`03-api-contract.md#…`) не переписуємо.

Base every test case on these pages and cite the page or section it comes from. Where the docs are ambiguous or contradict each other, check `05 — Open Questions` and `07 — Clarifications`. If the question is still open, list it as an open question; don't invent the expected behaviour.

### Виняток: локальні документи

Є два винятки з правила «документація — з Confluence»:

1. `scripts/uncovered-rules.mjs` не вміє ходити в MCP і **навмисно читає локальний**
   `../skypermit/docs/06-business-rules.md`.
   Ризик: локальна копія може відставати від `06 — Business Rules` у Confluence; за розбіжності діє Confluence.
2. `../skypermit/public/openapi.yaml` — джерело статусів і тіл відповідей, яких немає в Confluence
   (наприклад, `200 {"ok": true}` для `validate`). Його читають `tc-verifier` (`mode: api`),
   `api-test-case-creator` і `postman-collection-builder`.
   Таке значення в кейсі й у звіті позначай **«підтверджено лише openapi.yaml»**
   (джерело — `openapi.yaml:<рядок>`). Якщо `openapi.yaml` суперечить Confluence
   (`03 — API Contract`, `06 — Business Rules`), діє Confluence.

Пошук `data-testid`, маршрутів і логіки гейтів, як і раніше, іде в коді `../skypermit` (`app/`, `components/`, `lib/`).

## Мова

- Усі файли в цьому репозиторії (тест-кейси, тест-плани, звіти ревʼю, скіли, агенти, коментарі, commit messages) пиши **українською**.
- Ідентифікатори зі специфікації та коду (`DRAFT`, `POST /api/v1/requests`, `422`, `data-testid`) залишай як в оригіналі.

## Де можна читати й писати

| Папка | Читання | Запис / команди |
|---|---|---|
| `.` (корінь цього репозиторію) | так | так — усі зміни лише тут |
| `../skypermit` | так (Read / Glob / Grep) | ні — ні файлами, ні shell |
| Confluence `SD` | так (лише MCP-читання) | ні |

- Будь-яка команда, що змінює файли (`mv`, `cp`, `rm`, `sed -i`, `>`, `Set-Content` тощо),
  має вказувати лише шляхи всередині цього репозиторію.
- Перед shell-командою, яка щось записує, переконайся, що робоча папка — корінь QA-kit
  (`pwd`); якщо ні — спершу поверни її туди.

## `../skypermit` is READ-ONLY

Claude may only **read** files in `../skypermit`. It must never:

- modify, create, rename or delete any file or directory there;
- run any command there (no builds, scripts, package managers, tests, or shell commands whose working directory is inside `../skypermit`);
- run git operations there: no commit, branch, checkout, stash, reset, or anything else that changes repository state.

Use the Read, Glob and Grep tools to look at its contents. All output goes into this repository only.

- Віддавай перевагу Read / Glob / Grep зі шляхами `../skypermit/...`, а не shell.
- Якщо без shell не обійтися, команда має виконуватися з кореня цього репозиторію,
  а на skypermit посилатися лише за відносним шляхом
  (`grep ... ../skypermit/app/...`). Ніколи не роби `cd` / `Set-Location`
  у `../skypermit` — робоча папка зберігається між викликами, і всі наступні команди
  виявляться «запущеними там».
- Якщо робоча папка все ж опинилася всередині `../skypermit`, насамперед поверни її
  в корінь QA-kit, нічого більше не запускаючи.

## Planned directory structure

- `test-cases/`: generated test cases.
- `test-plans/`: generated one-page test plans (`TP-<doc-name>.md` per document, `TP-all-docs.md` for the whole folder). Produced by the `test-plan-creator` skill.
- `.claude/skills/`: project skills for Claude Code, such as reusable workflows for generating test cases and plans.

Create `test-cases/` and `test-plans/` when the first artifact is added.

## Notes

- `README.md` is encoded as UTF-16 LE with a BOM, not UTF-8. Tools such as `cat` and `grep` show it as spaced-out or garbled text.
- Development happens on Windows (PowerShell primary, Git Bash available).
- `.mcp.json` відстежується git: секрети в ньому лише як `${VAR}`, значення — у змінних ОС. Перед комітом перевіряй, що в `env` і `headers` лише `${…}`.
