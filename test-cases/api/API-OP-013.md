# API-OP-013: Validate з window_start = час перевірки + 6 год 01 хв (мінімум 6 год) → 200

**Doc ref:** `SD/06 — Business Rules#1.4 TIME_WINDOW`, `SD/03 — API Contract#Gate pipeline (shared by submit and validate)`, `SD/03 — API Contract#Flight requests`, `lib/gates/time-window-gate.ts`, `public/openapi.yaml`
**Role(s):** Operator (L1, ACTIVE) — сесія оператора
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений (унікальні email і `national_id` для цього кейса).
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = за 2 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (клас `OPEN`, curfew немає, `required_authorisation_level` = `L1`, `ceiling_metres` = 120), `requested_altitude_metres` = `50`, `window_start` = час перевірки + 6 год 01 хв, `window_end` = `window_start` + 30 хв.

**Steps:**
1. `POST /api/v1/flight-requests/{{flightRequestId}}/validate`
   Авторизація: сесія оператора (власник заявки)
   Тіло: —

**Expected result:** Відповідь `200` з тілом `{"ok": true}` (за `openapi.yaml`; у `SD/03` код і тіло відповіді `validate` для випадку «усі гейти пройдено» не зафіксовано). Стан заявки лишається `DRAFT`.

**Rationale:** Позитивна межа правила «Minimum lead time» (`06#1.4`: ≥ 6 годин, `TSD-4 §2.1`) з боку над межею: 6 год 01 хв — на 1 хвилину вище мінімуму. Запас у хвилину робить кейс стабільним попри час, що спливає між підготовкою заявки й викликом `validate`. Усі інші гейти й умови `TIME_WINDOW` проходять (60 днів не перевищено, тривалість 30 хв, curfew немає). Код `200` за `openapi.yaml`; у `03` не зафіксовано. Сусідня межа: `API-OP-011`. Відкритих питань із `05` і `07` немає.
