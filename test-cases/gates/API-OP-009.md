# API-OP-009: Submit з вікном 22:30–23:00 UTC у зоні LVV-RST-2 (curfew 22:00–06:00) → 422 TIME_WINDOW, ZC-2026.1 §3

**Doc ref:** `06-business-rules.md#1.4 TIME_WINDOW`, `06-business-rules.md#6. rule_reference values`, `06-business-rules.md#4. Zone catalogue`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`, `lib/curfew.ts`
**Role(s):** Operator (L3, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L3` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_BVLOS`, `certified_on` = дата за 2 місяці до `window_start` (сертифікація чинна на `window_start`).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `LVV-RST-2` (клас `RESTRICTED`, `ceiling_metres` = 60, `permitted_bands` = C0–C1, `required_authorisation_level` = `L3`, curfew 22:00–06:00), `requested_altitude_metres` = `40`, `window_start` = 22:30 UTC дати, що настає через 7 днів від моменту подання, `window_end` = 23:00 UTC тієї ж доби (тривалість 30 хвилин; усе вікно лежить усередині curfew).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW` і `rule_reference` = `ZC-2026.1 §3`.

**Rationale:** Негативна перевірка правила «Curfew» (`TSD-4` §4) гейту `TIME_WINDOW` для зони без поправки `A-7`: за `06#1.4` жодна частина вікна не може потрапляти в curfew зони. Для `LVV-RST-2` чинний curfew 22:00–06:00 за `ZC-2026.1` §3 без змін (`06#1.4`, `06#4`), тому `rule_reference` — `ZC-2026.1 §3` (`06#6`: рядок «Falls within curfew — other zones»), а не `A-7 §1`, який діє лише для `KBP-CTR-3` і `ODS-CTR-5` (їх покриває `API-OP-008`). Вікно 22:30–23:00 UTC потрапляє в curfew за будь-якого розумного зсуву зона-локального часу відносно UTC (UTC, UTC+2, UTC+3 дають 22:30–23:00, 00:30–01:00 або 01:30–02:00), тож результат не залежить від того, що часовий пояс «zone-local» у docs не зазначено (код приймає `Europe/Kyiv`: `lib/curfew.ts`). Лід-тайм 7 днів лежить між 6 годинами та 60 днями, тривалість 30 хв у межах 15–240 хв, тож `TSD-4 §2.1`, `§2.2`, `§3` проходять і не спрацьовують раніше. Решта параметрів валідна (рейтинг `R_BVLOS` дозволений у зоні `RESTRICTED`, смуга `C0` ∈ C0–C1, висота 40 м ≤ 60 м, рівень оператора `L3` ≥ `L3`), тож гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять. Граничні значення curfew, вікно, що лише зачепляє curfew, і зона `ZTM-RST-7` тут не перевіряються — це окремі кейси. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
