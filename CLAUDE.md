# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a QA kit for the **skypermit** project, which lives at `../skypermit`. Claude's main job here is to write **manual test cases and test plans** from the specification in `../skypermit/docs/`. Writing automated tests is not part of the job unless the user asks for it.

Source specification (`../skypermit/docs/`):

- `01-data-model.md`
- `02-state-machine.md`
- `03-api-contract.md`
- `04-frontend-spec.md`
- `05-open-questions.md`
- `06-business-rules.md`
- `07-clarifications.md`
- `08-uml-diagrams.md`

Base every test case on these docs and cite the doc or section it comes from. Where the docs are ambiguous or contradict each other, check `05-open-questions.md` and `07-clarifications.md`. If the question is still open, list it as an open question; don't invent the expected behaviour.

## Мова

- Усі файли в цьому репозиторії (тест-кейси, тест-плани, звіти ревʼю, скіли, агенти, коментарі, commit messages) пиши **українською**.
- Ідентифікатори зі специфікації та коду (`DRAFT`, `POST /api/v1/requests`, `422`, `data-testid`) залишай як в оригіналі.

## Де можна читати й писати

| Папка | Читання | Запис / команди |
|---|---|---|
| `.` (корінь цього репозиторію) | так | так — усі зміни лише тут |
| `../skypermit` | так (Read / Glob / Grep) | ні — ні файлами, ні shell |

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
  (`grep ... ../skypermit/docs/...`). Ніколи не роби `cd` / `Set-Location`
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
