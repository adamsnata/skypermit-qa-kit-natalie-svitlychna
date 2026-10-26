# API-OP-003: Submit з requested_altitude_metres = 121 у зоні DNI-OPN-1 (ceiling 120 м) → 422 ZONE, ZC-2026.1 §2

**Doc ref:** `06-business-rules.md#1.3 ZONE`, `06-business-rules.md#4. Zone catalogue`, `06-business-rules.md#6. rule_reference values`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `07-clarifications.md#4. The two inferred ZONE rows`, `lib/gates/zone-gate.ts`
**Role(s):** Operator (L1, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L1` і `status` = `ACTIVE` залогінений (`L1` вистачає для зони `DNI-OPN-1`, `required_authorisation_level` = `L1`).
- Пілот цього оператора: `rating` = `R_BASIC` (зона `OPEN` приймає будь-який рейтинг), `certified_on` = дата за 3 місяці до `window_start` (сертифікація чинна).
- ЛА цього оператора: `mtom_grams` = `500` (смуга `C0`, дозволена в `DNI-OPN-1`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `DNI-OPN-1` (`ceiling_metres` = 120, curfew відсутній), `requested_altitude_metres` = `121`, вікно 60 хвилин, `window_start` = через 3 дні о 12:00 UTC (лід-тайм > 6 год, горизонт < 60 днів).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `ZONE` і `rule_reference` = `ZC-2026.1 §2`.

**Rationale:** Негативна перевірка умови «Altitude within ceiling» гейту `ZONE`: за `06#1.3` `requested_altitude_metres` має бути ≤ `ceiling_metres` зони, а в `DNI-OPN-1` стеля 120 м (`06#4`); значення 121 — на 1 м вище межі. Рішення «altitude vs. ceiling → `ZONE`» підтверджене в `07#4`. `rule_reference` — `ZC-2026.1 §2` (`06#6`; цитата спільна з ваговою смугою гейту `AIRCRAFT`, їх розрізняє `failing_gate`). Інші гейти навмисно проходять (рейтинг і сертифікація чинні, смуга `C0` дозволена, вікно коректне, curfew немає), тож `failing_gate` однозначно `ZONE`. Межа «рівно 120 м → проходить» тут не перевіряється — це окремий граничний кейс. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
