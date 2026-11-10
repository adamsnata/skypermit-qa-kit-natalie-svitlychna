# API-OP-014: Ланцюжок validate 422 → submit 422 → REJECTED → повторний submit 409 (лід-тайм 3 год)

**Doc ref:** `SD/02 — Request Lifecycle#States`, `SD/03 — API Contract#Error semantics`, `SD/03 — API Contract#Flight requests`, `SD/06 — Business Rules#1.4 TIME_WINDOW`, `SD/06 — Business Rules#6. rule_reference values`
**Role(s):** Operator (L1, ACTIVE) — сесія оператора
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений (унікальні email і `national_id` для цього кейса).
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = за 2 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew немає, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = час першого кроку + 3 год, `window_end` = `window_start` + 30 хв. Id заявки збережено як `{{flightRequestId}}`.

**Steps:**
1. `POST /api/v1/flight-requests/{{flightRequestId}}/validate`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `422`; `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок
2. `GET /api/v1/flight-requests/{{flightRequestId}}`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `200`; `state` = `DRAFT`
3. `POST /api/v1/flight-requests/{{flightRequestId}}/submit`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `422`; `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок
4. `GET /api/v1/flight-requests/{{flightRequestId}}`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `200`; `state` = `REJECTED`
5. `POST /api/v1/flight-requests/{{flightRequestId}}/submit`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `409`

**Expected result:** Повторний `submit` на заявці в `REJECTED` повертає `409` (а не `422`). Підсумок ланцюжка: `validate` з `422` (`failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок) не змінює state (`DRAFT`); `submit` з тим самим `422` переводить заявку в `REJECTED`; з цього стану подальший `submit` неможливий.

**Rationale:** Один інваріант: gate-failure при `submit` веде в `REJECTED`, а `validate` state не змінює. За `SD/02#States` `DRAFT` → `submit` → `REJECTED` при невдалому гейті, `REJECTED` — термінальний, а будь-яка пара (state, action) поза таблицею переходів дає `409`. За `SD/03#Error semantics` `409` — «неможливо спробувати», `422` — «спробували, правило відмовило», тому крок 5 дає саме `409`. Лід-тайм 3 год нижче межі 6 год (`06#1.4`, `TSD-4 §2.1`); гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять. Текст `message` у docs не зафіксований. Відкритих питань із `05` і `07` для цього сценарію немає. Ланцюжок: так — кандидат у колекцію Postman.
