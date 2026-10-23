# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a QA kit for the **skypermit** project, which lives at `../skypermit` (`C:\workspace\skypermit`). Claude's main job here is to write **manual test cases and test plans** from the specification in `../skypermit/docs/`. Writing automated tests is not part of the job unless the user asks for it.

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

## Где можно читать и писать

| Папка | Чтение | Запись / команды |
|---|---|---|
| `C:\workspace\skypermit-qa-kit-natalie-svitlychna` (этот репозиторий) | да | да — все изменения только здесь |
| `C:\workspace\skypermit` | да (Read / Glob / Grep) | нет — ни файлами, ни shell |

- Любая команда, которая меняет файлы (`mv`, `cp`, `rm`, `sed -i`, `>`, `Set-Content` и т.п.),
  должна указывать только пути внутри этого репозитория.
- Перед shell-командой, которая что-то пишет, убедись, что рабочая папка — корень QA-kit
  (`pwd`); если нет — сначала верни её туда.

## `../skypermit` is READ-ONLY

Claude may only **read** files in `../skypermit`. It must never:

- modify, create, rename or delete any file or directory there;
- run any command there (no builds, scripts, package managers, tests, or shell commands whose working directory is inside `../skypermit`);
- run git operations there: no commit, branch, checkout, stash, reset, or anything else that changes repository state.

Use the Read, Glob and Grep tools to look at its contents. All output goes into this repository only.

- Предпочитай Read / Glob / Grep с абсолютными путями (`C:\workspace\skypermit\...`), а не shell.
- Если без shell не обойтись, команда должна выполняться из корня этого репозитория,
  а на skypermit ссылаться только по абсолютному пути
  (`grep ... /c/workspace/skypermit/docs/...`). Никогда не делай `cd` / `Set-Location`
  в `../skypermit` — рабочая папка сохраняется между вызовами, и все следующие команды
  окажутся «запущенными там».
- Если рабочая папка всё же оказалась внутри `../skypermit`, первым делом верни её
  в корень QA-kit, ничего больше не запуская.

## Planned directory structure

- `test-cases/`: generated test cases.
- `test-plans/`: generated one-page test plans (`TP-<doc-name>.md` per document, `TP-all-docs.md` for the whole folder). Produced by the `test-plan` skill.
- `.claude/skills/`: project skills for Claude Code, such as reusable workflows for generating test cases and plans.

Create `test-cases/` and `test-plans/` when the first artifact is added.

## Notes

- `README.md` is encoded as UTF-16 LE with a BOM, not UTF-8. Tools such as `cat` and `grep` show it as spaced-out or garbled text.
- Development happens on Windows (PowerShell primary, Git Bash available).
