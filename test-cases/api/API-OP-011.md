# API-OP-011: Validate з window_start = час перевірки + 5 год 59 хв (мінімум 6 год) → 422 TIME_WINDOW

**Doc ref:** `SD/06 — Business Rules#1.4 TIME_WINDOW`, `SD/06 — Business Rules#6. rule_reference values`, `SD/03 — API Contract#The 422 body`, `SD/03 — API Contract#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — сесія оператора
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений (унікальні email і `national_id` для цього кейса).
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = за 2 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew немає, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = час перевірки + 5 год 59 хв, `window_end` = `window_start` + 30 хв.

**Steps:**
1. `POST /api/v1/flight-requests/{{flightRequestId}}/validate`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок. Стан заявки лишається `DRAFT`.

**Rationale:** Негативна межа правила «Minimum lead time» (`06#1.4`: ≥ 6 годин між поданням і `window_start`, `TSD-4 §2.1`): 5 год 59 хв — на 1 хвилину нижче межі. Для `validate` відлік іде від моменту виклику (`lib/gates/time-window-gate.ts`), тому `window_start` виставляють відносно моменту кроку 1. Гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять (`R_BASIC` у `OPEN`, `C0` дозволена, 50 м ≤ 120 м, `L1` ≥ `L1`), інші умови `TIME_WINDOW` (тривалість 30 хв, curfew немає, перетинів немає) не спрацьовують раніше. Точний текст `message` у docs не зафіксований. Сусідня межа: `API-OP-013` (6 год 01 хв). Відкритих питань із `05` і `07` для цього правила немає.
