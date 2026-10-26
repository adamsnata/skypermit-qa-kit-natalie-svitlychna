---
name: cover-gaps
description: Закриває прогалини покриття — знаходить бізнес-правила гейтів із ../skypermit/docs/06-business-rules.md, для яких у test-cases/ ще немає кейсів, створює кейс на кожне, перевіряє його субагентом tc-verifier і повертає JSON-підсумок. Використовуй, коли користувач викликає /cover-gaps (напр. `/cover-gaps 3 PILOT`) або просить «закрий прогалини покриття», «знайди правила без кейсів», «згенеруй кейси для непокритих правил», "cover gaps".
argument-hint: "[максимум правил] [гейт], напр. 3 PILOT"
disable-model-invocation: true   # дорогий пайплайн — лише ручний /виклик
allowed-tools: Read Grep Glob Write(test-cases/**)  
---

# cover-gaps — кейси для непокритих правил

Оркестратор: сам кейси не пише й не перевіряє, а керує трьома виконавцями — скриптом `scripts/uncovered-rules.mjs` (без моделі), скілом `test-case-creator` (Sonnet) і субагентом `tc-verifier` (Haiku, лише читання). Кожне правило проходить увесь конвеєр до переходу до наступного: так витрати передбачувані, а зупинити прогін можна між правилами.

## Обмеження

- `C:\workspace\skypermit\` — лише читання. Нічого там не створюй, не змінюй, не запускай.
- Жодних git-операцій і встановлення пакетів.
- Команди виконуй з кореня цього репозиторію (`C:\workspace\skypermit-qa-kit-natalie-svitlychna`). Перед `rm` і `node` перевір `pwd`.
- Увесь текст для користувача — українською.

## Аргументи

Рядок аргументів — до двох слів, порядок будь-який:

- ціле число > 0 → `max` (максимум правил); за замовчуванням `3`;
- `PILOT` | `AIRCRAFT` | `ZONE` | `TIME_WINDOW` (регістр неважливий) → `gate`; за замовчуванням усі гейти.

Приклади: `3 PILOT`, `5`, `zone`, без аргументів (= 3 правила з усіх гейтів). Усе інше (невідоме слово, 0, від'ємне число, більше ніж по одному значенню кожного виду) — зупинись і поясни формат, нічого не запускаючи.

## Непокриті правила (підставлено до початку роботи)

!`node scripts/uncovered-rules.mjs $ARGUMENTS`

## Крок 1. Візьми правила

Скрипт уже виконано вище (команду не запускай): це JSON без моделі, обрізаний за `max` і `gate`. Візьми `by_gate`, об'єднай списки в порядку гейтів (`PILOT`, `AIRCRAFT`, `ZONE`, `TIME_WINDOW`). `rules_checked` = `total`, `gaps_found` = `gaps_total` зі скрипта (усі прогалини до обрізання за `max`). Для кожного правила з цього списку веди запис у `results` (див. крок 5). Якщо правил 0 — виведи підсумок із порожніми `results` і `open_questions` і скажи, що прогалин немає. Якщо замість JSON вивід містить повідомлення про помилку (`uncovered-rules: …`) — покажи його й зупинись.

Далі для кожного правила по черзі виконуй кроки 2–4.

## Крок 2. Правило з `open: true`

Кейс не генеруй: джерело правила не підтверджене (див. `05-open-questions.md`), а вигадувати очікувану поведінку не можна. Додай у `open_questions` запис `{"rule_id": …, "question": "<title правила> — джерело не підтверджене", "source": "open_rule"}`, у `results` — запис зі `status: "open_question"` і переходь до наступного правила.

## Крок 3. Створи кейс

Викликай скіл `test-case-creator` (Skill tool), у `args` передай JSON правила з виводу скрипта як є (`id`, `gate`, `title`, `citation`, `open`). Скіл працює без запитань і останнім рядком повертає `{"rule_id","status","case_id","path"}`.

- `status = created` і файл `path` справді існує (перевір Glob) → крок 4.
- `status = skipped`, `open_question`, або файл не з'явився (типово — хук `validate-test-case.mjs` заблокував запис і скіл не впорався) → це невдала спроба. Виклич скіл ще раз для того самого правила, додавши в `args` після JSON пояснення «попередня спроба відхилена: <текст помилки, якщо він є у відповіді скіла>». Максимум **2 спроби** на правило. Після другої невдачі додай у `results` запис зі `status: "failed"` і `reason: "<чому>"` та переходь до наступного правила.
- Якщо скіл поверне `open_question` для правила, яке скрипт позначив `open: false`, — додай запис у `open_questions` із `source: "test-case-creator"`, у `results` — `status: "open_question"`; спробу не повторюй.

Правило, яке з якоїсь причини не оброблялося (наприклад, прогін зупинено користувачем), іде в `results` зі `status: "skipped"`.

## Крок 4. Перевір кейс

Запусти субагента `tc-verifier` (Agent tool, `subagent_type: "tc-verifier"`) з текстом «Перевір тест-кейс <case_id>». Модель (Haiku) і режим «лише читання» задані в самому агенті. Останній рядок його відповіді — `{"case_id","verdict","failed_items","silent_items"}`. Якщо цей рядок не вдається розібрати як JSON — запиши в `results` `status: "failed"` із `reason` «відповідь tc-verifier не розібрана» і залиш файл кейсу на місці.

За `verdict`:

| verdict | Дія |
|---|---|
| `pass` | У `results`: `status: "created"`, `verdict: "pass"`. Нічого більше. |
| `fail` («не відповідає») | Видали файл кейсу: `rm test-cases/<module>/<case_id>.md`. Шлях має починатися з `test-cases/`, закінчуватися на `.md`, не містити `..` і збігатися з `path` зі кроку 3 — інакше не видаляй і запиши `status: "failed"`. Інакше у `results`: `status: "deleted"`, `verdict: "fail"`, `reason: "<failed_items.reason через «; »>"`. Видаляє саме оркестратор: `tc-verifier` лише читає. |
| `no-spec` («документація мовчить») | Усі `silent_items` → `open_questions` (`{"rule_id","question","source": "tc-verifier","q_id"}`). Файл кейсу **залишається**: питання відкрите, а не доведено, що кейс хибний, і видалення втратило б роботу, яку можна доуточнити пізніше. У `results`: `status: "created"`, `verdict: "no-spec"`. |

## Крок 5. Підсумок

Після останнього правила виведи **один** JSON і нижче 2–4 речення українською: скільки правил оброблено, що створено/видалено, що пішло у відкриті питання, чи були помилки.

```json
{
  "rules_checked": 14,
  "gaps_found": 5,
  "results": [
    {"rule_reference": "<citation з 06-business-rules.md>", "gate": "TIME_WINDOW", "case_id": "API-OP-004", "status": "created", "verdict": "pass", "reason": null},
    {"rule_reference": "<citation>", "gate": "PILOT", "case_id": "API-OP-003", "status": "deleted", "verdict": "fail", "reason": "…"},
    {"rule_reference": "<citation>", "gate": "ZONE", "case_id": null, "status": "open_question", "verdict": null, "reason": "…"}
  ],
  "open_questions": []
}
```

- `rules_checked` — `total`, `gaps_found` — `gaps_total` зі скрипта (див. крок 1). `results` — по одному запису на кожне правило, взяте в роботу, у порядку обробки.
- `rule_reference` — `citation` правила (якщо `null` — `id` правила); `gate` — гейт правила.
- `status`: `created` (кейс записано й лишено) | `deleted` | `open_question` | `failed` | `skipped`. `verdict`: `pass` | `fail` | `no-spec` | `null` (верифікацію не запускали). `case_id` — `null`, якщо кейса немає. `reason` — `null`, якщо нічого пояснювати.
- `open_questions` — список об'єктів `{"rule_id","question","source","q_id"?}`; порожній — `[]`.
- Не додавай інших полів.
