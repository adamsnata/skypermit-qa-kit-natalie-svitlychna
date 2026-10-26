# API-OP-010: Submit з вікном 12:30–13:30 UTC, що перетинає UNDER_REVIEW-заявку того ж ЛА (12:00–13:00) → 422 TIME_WINDOW, TSD-4 §5

**Doc ref:** `06-business-rules.md#1.4 TIME_WINDOW`, `06-business-rules.md#6. rule_reference values`, `02-state-machine.md#Rules that affect the state machine but live elsewhere`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = дата за 2 місяці до `window_start` (сертифікація чинна на `window_start`).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- Заявка A цього оператора для того самого ЛА у стані `UNDER_REVIEW` (пройшла всі гейти): `zone_code` = `DNI-OPN-1`, `requested_altitude_metres` = `50`, `window_start` = 12:00 UTC дати, що настає через 7 днів від моменту подання, `window_end` = 13:00 UTC тієї ж доби.
- `FlightRequest` B у `DRAFT` для цього пілота й того самого ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew відсутній, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = 12:30 UTC тієї ж доби, `window_end` = 13:30 UTC (тривалість 60 хвилин; перетин із заявкою A — 30 хвилин, 12:30–13:00).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для заявки B (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW` і `rule_reference` = `TSD-4 §5`.

**Rationale:** Негативна перевірка правила «No overlap» гейту `TIME_WINDOW`: за `06#1.4` жодна інша заявка `APPROVED` або `UNDER_REVIEW` для **того самого ЛА** не може ділити з вікном жодного моменту; `02#Rules that affect the state machine` підтверджує, що перевірка враховує саме ці два стани. `rule_reference` — `TSD-4 §5` (`06#6`). Заявка A у `UNDER_REVIEW` обрана як стан, що враховується (стан `APPROVED` — окремий кейс). Перетин 30 хвилин всередині обох вікон, тож граничні випадки (вікна, що лише торкаються: один закінчується о 13:00, наступний починається о 13:00 — не перетин за `06#1.4`; повне вкладення; заявки в станах `DRAFT`/`REJECTED`/`CANCELLED`/`COMPLETED`; інше ЛА) тут не перевіряються — це окремі кейси. Лід-тайм 7 днів лежить між 6 годинами та 60 днями, тривалість 60 хв у межах 15–240 хв, curfew у `DNI-OPN-1` відсутній, тож `TSD-4 §2.1`, `§2.2`, `§3` і curfew не спрацьовують раніше за перевірку перетину. Решта параметрів валідна (рейтинг `R_BASIC` дозволений в зоні `OPEN`, смуга `C0` дозволена, висота 50 м ≤ 120 м, рівень `L1` ≥ `L1`), тож гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять. Неоднозначність у docs: `03-api-contract.md#Error semantics` відносить `409` до «scheduling conflict between requests», тоді як `06#1.4` і `06#6` описують перетин як правило гейту `TIME_WINDOW` з `rule_reference` `TSD-4 §5`, а `02#Rules that affect the state machine` називає перевірку частиною гейтів (`422` за `03#The 422 body`); кейс написано за `06` і `02`, тож очікується `422`, а не `409`. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. У `05-open-questions.md` питань щодо цього правила немає.
