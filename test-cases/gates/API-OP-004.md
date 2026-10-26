# API-OP-004: Submit оператором L1 у зоні KBP-CTR-3 (потрібен L2) → 422 ZONE, OH-1 §4

**Doc ref:** `06-business-rules.md#1.3 ZONE`, `06-business-rules.md#4. Zone catalogue`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `07-clarifications.md#4. The two inferred ZONE rows`, `lib/gates/zone-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_ADVANCED` (покриває клас `CONTROLLED`), `certified_on` = дата за 4 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `2000` (смуга `C1`, дозволена в `KBP-CTR-3`: C0–C2).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `KBP-CTR-3` (`required_authorisation_level` = `L2`, `ceiling_metres` = 120), `requested_altitude_metres` = `80` (в межах стелі), вікно 45 хвилин, `window_start` = через 5 днів о 14:00 UTC (поза curfew 23:00–05:00, лід-тайм > 6 год, горизонт < 60 днів).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `ZONE` і `rule_reference` = `OH-1 §4`.

**Rationale:** Негативна перевірка умови «Operator authorisation level» гейту `ZONE`: за `06#1.3` `authorisation_level` оператора має бути ≥ `required_authorisation_level` зони (`L1` < `L2` < `L3`), а `KBP-CTR-3` вимагає `L2` (`06#4`); оператор `L1` — на один щабель нижче. Правило підтверджене власником правил (`07#4`), `rule_reference` — `OH-1 §4` (`06#6`). Умова стелі виконана (80 м ≤ 120 м), тож перша умова гейту `ZONE` (`ZC-2026.1 §2`) не спрацьовує, а `rule_reference` однозначно вказує на другу. Гейти `PILOT` і `AIRCRAFT` проходять. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
