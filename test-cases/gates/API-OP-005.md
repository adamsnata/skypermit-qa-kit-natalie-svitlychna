# API-OP-005: Submit за 3 години до window_start (мінімум 6 годин) → 422 TIME_WINDOW, TSD-4 §2.1

**Doc ref:** `06-business-rules.md#1.4 TIME_WINDOW`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = дата за 2 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew відсутній, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, тривалість вікна 30 хвилин, `window_start` = моменту подання + 3 години (тобто на момент кроку 1 до `window_start` лишається близько 3 годин, менше за 6).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW` і `rule_reference` = `TSD-4 §2.1`.

**Rationale:** Негативна перевірка правила «Minimum lead time» гейту `TIME_WINDOW`: за `06#1.4` між поданням і `window_start` має бути щонайменше 6 годин. `rule_reference` — `TSD-4 §2.1` (`06#6`). Значення 3 години взято з запасом нижче межі, тож граничні значення (рівно 6 годин, 5 год 59 хв) тут не перевіряються — це окремі кейси. Зона `DNI-OPN-1` обрана без curfew, а решта параметрів валідні (рейтинг `R_BASIC` дозволений в зоні `OPEN`, смуга `C0` дозволена, висота 50 м ≤ 120 м, тривалість 30 хв), тож гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять, а інші умови `TIME_WINDOW` не спрацьовують раніше. Відлік лід-тайму — від моменту подання (`06#1.4`: «between submission and `window_start`»), тому `window_start` варто виставляти відносно часу виконання кроку 1. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
