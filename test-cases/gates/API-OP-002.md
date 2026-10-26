# API-OP-002: Submit з пілотом, чия сертифікація спливла до window_start → 422 PILOT, OH-1 §2.3

**Doc ref:** `06-business-rules.md#1.1 PILOT`, `06-business-rules.md#2. Pilot currency threshold`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `01-data-model.md#Derived, never stored`, `lib/derived.ts`, `lib/gates/pilot-gate.ts`
**Role(s):** Operator (L2, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L2` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BVLOS` (покриває клас `CONTROLLED`, тож умова `OH-1 §2.1` виконується), `certified_on` = дата за 19 місяців до `window_start` (понад 18 місяців — сертифікація до вікна польоту не чинна).
- ЛА цього оператора: `mtom_grams` = `1000` (смуга `C1`, дозволена в зоні `KBP-CTR-3`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `KBP-CTR-3`, `requested_altitude_metres` = `100`, вікно 60 хвилин, `window_start` = через 7 днів о 10:00 UTC (поза curfew 23:00–05:00, лід-тайм > 6 год, горизонт < 60 днів).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `PILOT` і `rule_reference` = `OH-1 §2.3`.

**Rationale:** Негативна перевірка другої умови гейту `PILOT`: за `06#1.1` і `06#2` сертифікація чинна 18 місяців від `certified_on` без пільгового періоду й перевіряється відносно `window_start`, а не часу подання. `rule_reference` для цієї умови — `OH-1 §2.3` (`06#6`). Рейтинг `R_BVLOS` обрано навмисно, щоб перша умова гейту (`OH-1 §2.1`) пройшла і `failing_gate` та `rule_reference` однозначно вказували на другу. Дата за 19 місяців до вікна взята з запасом, тож межа «рівно 18 місяців» (чи рахується останній день включно) тут не перевіряється — це окремий граничний кейс. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань для цього правила в `05-open-questions.md` немає.
