# API-OP-001: Submit з пілотом R_BASIC у зоні CONTROLLED → 422 PILOT, OH-1 §2.1

**Doc ref:** `06-business-rules.md#1.1 PILOT`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `01-data-model.md#Enumerations`, `lib/gates/pilot-gate.ts`, `app/api/v1/flight-requests/[id]/submit/route.ts`
**Role(s):** Operator (L2, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L2` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BASIC`, `certified_on` = дата за 6 місяців до `window_start` (сертифікація чинна, тож `OH-1 §2.3` не спрацьовує).
- ЛА цього оператора: `mtom_grams` = `1000` (смуга `C1`, дозволена в зоні `KBP-CTR-3`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `KBP-CTR-3` (`zone_class` = `CONTROLLED`), `requested_altitude_metres` = `100`, вікно 60 хвилин, `window_start` = через 7 днів о 10:00 UTC (поза curfew 23:00–05:00, лід-тайм > 6 год, горизонт < 60 днів).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `PILOT` і `rule_reference` = `OH-1 §2.1`.

**Rationale:** Негативна перевірка першої умови гейту `PILOT`: за `06#1.1` `R_BASIC` дозволяє лише зони `OPEN`, а `KBP-CTR-3` має клас `CONTROLLED`; `rule_reference` для цієї умови — `OH-1 §2.1` (`06#6`). Інші гейти навмисно проходять (рівень `L2` вистачає для `KBP-CTR-3`, смуга `C1` дозволена, вікно коректне), тож `failing_gate` однозначно `PILOT`. Текст `message` у docs не зафіксований (лише «specific to the failure»), тому в очікуваний результат не включено. Перехід заявки в `REJECTED` — окрема перевірка за `02-state-machine.md`, тут не перевіряється. Відкритих питань із `05-open-questions.md` для цього правила немає; `07-clarifications.md` його не змінює.
