# API-OP-015: Ланцюжок submit 422 (лід-тайм 4 год) → GET заявки: REJECTED, failing_gate і rejection_reason заповнені

**Doc ref:** `SD/02 — Request Lifecycle#States`, `SD/03 — API Contract#Flight requests`, `SD/03 — API Contract#The 422 body`, `SD/06 — Business Rules#1.4 TIME_WINDOW`, `SD/06 — Business Rules#6. rule_reference values`, `public/openapi.yaml`
**Role(s):** Operator (L1, ACTIVE) — сесія оператора
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений (унікальні email і `national_id` для цього кейса).
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = за 2 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew немає, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = час першого кроку + 4 год, `window_end` = `window_start` + 30 хв. Id заявки збережено як `{{flightRequestId}}`.

**Steps:**
1. `POST /api/v1/flight-requests/{{flightRequestId}}/submit`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `422`; `failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок
2. `GET /api/v1/flight-requests/{{flightRequestId}}`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —
   → очікується: `200`; `state` = `REJECTED`, `failing_gate` = `TIME_WINDOW`, `rejection_reason` — непорожній рядок

**Expected result:** Підсумок ланцюжка: `submit` повертає `422` (`failing_gate` = `TIME_WINDOW`, `rule_reference` = `TSD-4 §2.1`, `message` — непорожній рядок), а наступний `GET` показує `state` = `REJECTED`, `failing_gate` = `TIME_WINDOW` і непорожнє `rejection_reason`. Точний текст `rejection_reason` у docs не зафіксований — `TODO: уточнити за вимогами`.

**Rationale:** Один інваріант: gate-failure при `submit` зберігається в заявці (`DRAFT` → `REJECTED`, поля `failing_gate` і `rejection_reason`) за `SD/02#States` і `SD/03#Flight requests`. Доповнює `API-OP-014`, де перевіряється лише `state` = `REJECTED`. Лід-тайм 4 год нижче межі 6 год (`06#1.4`, `TSD-4 §2.1`); гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять. Наявність `rejection_reason` (nullable string) підтверджено лише `openapi.yaml:271`. Відкритих питань із `05` і `07` для цього сценарію немає. Ланцюжок: так — кандидат у колекцію Postman.
