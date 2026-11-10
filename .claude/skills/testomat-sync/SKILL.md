---
name: testomat-sync
description: Синхронізує кейси з test-cases/ у Testomat.io — upsert без дублів, створення рану, звіт про результати.
argument-hint: "upsert <suite> <key> <files...> | run <title> <test_ids> | report <run_id> <results>"
allowed-tools:
  - Read
  - mcp__testomatio__suites_list
  - mcp__testomatio__suites_create
  - mcp__testomatio__tests_list
  - mcp__testomatio__tests_create
  - mcp__testomatio__runs_create
  - mcp__testomatio__runs_list
  - mcp__testomatio__testruns_list
  - mcp__testomatio__testruns_update
  - mcp__testomatio__runs_update
---

# testomat-sync

Єдине місце для всієї роботи з Testomat.io. Його викликають обидва оркестратори (UI і API). Інші скіли й агенти самі до `mcp__testomatio__*` не звертаються.

Скіл нічого не видаляє. Видалення тестів, суїтів і ранів — лише вручну або за прямою командою користувача з попереднім показом таблиці.

## Спільні правила

- Документацію й опис тестів пиши українською. Ідентифікатори (`E2E-OP-003`, `TIME_WINDOW`, `data-testid`) залишай як є.
- Не використовуй `link` з `type: "jira"`. Інтеграція Jira в проєкті не налаштована: API повертає `400 Jiraproject must exist`, але тест при цьому **може бути створений**. Повторна спроба дасть дубль. Ключ задачі передавай лише тегом (`type: "tag"`) і рядком `**Jira:** <key>` в описі.
- Після будь-якої помилки `tests_create` не повторюй виклик наосліп: спершу `tests_list` і перевір, чи тест уже з'явився.
- Testomat додає теги до `title` у вигляді ` @<тег>`. Для порівняння використовуй `clean_title`, а не `title`.

## Режим `upsert <suite> <key> <files...>`

Вхід: назва суїта, ключ задачі (наприклад `SKY-1`), список файлів кейсів із `test-cases/`.

1. **Суїт.** `suites_list` (`per_page: 100`) і пошук за точним збігом `title`. Якщо немає — `suites_create` із `file_type: "file"`. Тип `folder` не підходить: тести в папку зберегти не можна (`422 Can't save test into a folder suite`).
2. **Існуючі тести.** `tests_list` із `per_page: 100` і `fields: ["id","clean_title","self_tags","suite_id"]`. Пройди **всі** сторінки: поки `meta.has_more` = `true` (або `page` < `meta.total_pages`), викликай `tests_list` із наступним `page`. Не зупиняйся на першій сторінці, інакше існуючий тест можна не побачити й створити дубль. Залиши тести цього суїта.
3. **Для кожного файлу** прочитай його через `Read` і візьми `case_id` із заголовка (`# E2E-OP-003: …` → `E2E-OP-003`). Шукай тест, у якого `clean_title` починається з `"<case_id>:"`.
   - Знайдено один — використовуй його `id`, `tests_create` не викликай. Якщо в нього немає тега `<key>`, додай це в звіт (оновлення тега робить окрема команда, скіл її не виконує).
   - Знайдено два й більше — зупинись для цього кейса, додай його до списку `duplicates` і не створюй нічого.
   - Не знайдено — `tests_create`: `suite_id`, `title` = заголовок без `# `, `state: "manual"`, `priority` із файлу (за відсутності — `normal`), `link: [{"action":"add","type":"tag","value":"<key>"}]`, `description` = Markdown зі структурою: `**Jira:** <key>`, `**Doc ref:**`, `**Role:**`, `### Preconditions`, `### Steps`, `### Expected result`, `### Notes` (з поля Rationale).
4. **Результат.** Поверни таблицю й JSON: `{ "suite_id", "tests": [{ "case_id", "test_id", "action": "created|reused" }], "duplicates": [...] }`.

## Режим `run <title> <test_ids>`

1. Перед створенням `runs_list` (`per_page: 100`) і перевір, чи немає рану з такою самою назвою (`tql: title == '<title>'`). Пройди **всі** сторінки: поки `meta.has_more` = `true`, викликай `runs_list` із наступним `page`; не зупиняйся на першій. Якщо є — не створюй другий, поверни його `id` і напиши про це.
2. `runs_create`: `title`, `kind: "manual"` (для автотестів — `automated`), `test_ids`.
3. Поверни `run_id`.

## Режим `report <run_id> <results>`

Вхід: `run_id` і список результатів `{ test_id, status, message }`, де `status` — `passed | failed | skipped`. Для `failed` `message` обов'язковий: що очікувалось, що отримано, номер кроку.

1. `testruns_list` із `run_id` (`per_page: 100`, `fields: ["id","test_id","status"]`) — це дає відповідність `test_id` → числовий `testrun_id`. Пройди **всі** сторінки: поки `meta.has_more` = `true`, викликай `testruns_list` із наступним `page`; інакше тести з наступних сторінок потраплять до `not_in_run` помилково.
2. Для кожного результату — `testruns_update`: `testrun_id`, `status`, `message`. Провали записуй так само, як успіхи.
3. Якщо для якогось `test_id` немає запису в ране — не вигадуй, а винеси його в список `not_in_run`.
4. Коли всі записи оновлено — закрий ран: `runs_update` із `run_id` і `status_event: "finish_manual"` (для автоматизованого або змішаного рану — `finish`).
5. Поверни підсумок: `passed / failed / skipped`, посилання на ран, `not_in_run`.

## Чого скіл не робить

- Не читає Confluence і не створює кейси — це роботи `ui-test-case-creator` та інших скілів.
- Не змінює файли в `test-cases/`.
- Не видаляє нічого в Testomat.
