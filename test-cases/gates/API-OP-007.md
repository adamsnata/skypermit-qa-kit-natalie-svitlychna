# API-OP-007: Submit з тривалістю вікна 300 хвилин (максимум 240) → 422 TIME_WINDOW, TSD-4 §3

**Doc ref:** `06-business-rules.md#1.4 TIME_WINDOW`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = дата за 2 місяці до `window_start` (сертифікація чинна на `window_start`).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew відсутній, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = моменту подання + 24 години, `window_end` = `window_start` + 300 хвилин (тривалість 300 хв, більше за 240).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW` і `rule_reference` = `TSD-4 §3`.

**Rationale:** Негативна перевірка правила «Duration» гейту `TIME_WINDOW`: за `06#1.4` тривалість має бути 15–240 хвилин включно. `rule_reference` — `TSD-4 §3` (`06#6`). Значення 300 хв взято з запасом вище верхньої межі, тож граничні значення (15 і 240 хв — допустимі; 14 і 241 хв — недопустимі) та нижня межа (менше 15 хв) тут не перевіряються — це окремі кейси. Лід-тайм 24 години лежить між 6 годинами та 60 днями, тож перевірки `TSD-4 §2.1` і `TSD-4 §2.2` проходять і не спрацьовують раніше. Зона `DNI-OPN-1` обрана без curfew, решта параметрів валідні (рейтинг `R_BASIC` дозволений в зоні `OPEN`, смуга `C0` дозволена, висота 50 м ≤ 120 м), тож гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять, а порядок перевірок усередині `TIME_WINDOW` не змінює результат. `window_start` і `window_end` варто виставляти відносно часу виконання кроку 1. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
