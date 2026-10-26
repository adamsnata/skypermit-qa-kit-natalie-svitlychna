# API-OP-008: Submit з вікном 23:30–00:00 UTC у зоні KBP-CTR-3 (curfew 23:00–05:00) → 422 TIME_WINDOW, A-7 §1

**Doc ref:** `06-business-rules.md#1.4 TIME_WINDOW`, `06-business-rules.md#6. rule_reference values`, `06-business-rules.md#4. Zone catalogue`, `03-api-contract.md#The 422 body`, `03-api-contract.md#Gate pipeline (shared by submit and validate)`, `lib/gates/time-window-gate.ts`, `lib/curfew.ts`
**Role(s):** Operator (L2, ACTIVE) — залогінений, session cookie
**Preconditions:**
- Оператор з `authorisation_level` = `L2` і `status` = `ACTIVE` залогінений.
- Пілот цього оператора: `rating` = `R_ADVANCED`, `certified_on` = дата за 2 місяці до `window_start` (сертифікація чинна на `window_start`).
- ЛА цього оператора: `mtom_grams` = `700` (смуга `C0`).
- `FlightRequest` у `DRAFT` для цього пілота й ЛА: `zone_code` = `KBP-CTR-3` (клас `CONTROLLED`, `ceiling_metres` = 120, `permitted_bands` = C0–C2, `required_authorisation_level` = `L2`, curfew 23:00–05:00), `requested_altitude_metres` = `50`, `window_start` = 23:30 UTC дати, що настає через 7 днів від моменту подання, `window_end` = 00:00 UTC наступної доби (тривалість 30 хвилин; усе вікно лежить усередині curfew).

**Steps:**
1. Надіслати `POST /api/v1/flight-requests/{id}/submit` для цієї заявки (без тіла).

**Expected result:** Відповідь `422`; у тілі `failing_gate` = `TIME_WINDOW` і `rule_reference` = `A-7 §1`.

**Rationale:** Негативна перевірка правила «Curfew» гейту `TIME_WINDOW`: за `06#1.4` жодна частина вікна не може потрапляти в curfew зони. Для `KBP-CTR-3` чинний curfew 23:00–05:00 за `A-7` §1 (звужує загальне значення 22:00–06:00 з `ZC-2026.1`, `06#1.4`), тому `rule_reference` для цієї зони — `A-7 §1`, а не `TSD-4 §4` (`06#6`: рядок «Falls within curfew — `KBP-CTR-3`/`ODS-CTR-5`»; `TSD-4 §4` — розділ, що описує саме правило, але не значення `rule_reference`). Вікно 23:30–00:00 UTC потрапляє в curfew за будь-якого розумного зсуву зона-локального часу відносно UTC (UTC, UTC+2, UTC+3 дають 23:30–00:00, 01:30–02:00 або 02:30–03:00), тож результат не залежить від того, що часовий пояс «zone-local» у docs не зазначено (код приймає `Europe/Kyiv`: `lib/curfew.ts`). Лід-тайм 7 днів лежить між 6 годинами та 60 днями, тривалість 30 хв у межах 15–240 хв, тож `TSD-4 §2.1`, `§2.2`, `§3` проходять і не спрацьовують раніше. Решта параметрів валідна (рейтинг `R_ADVANCED` дозволений у зоні `CONTROLLED`, смуга `C0` ∈ C0–C2, висота 50 м ≤ 120 м, рівень оператора `L2` ≥ `L2`), тож гейти `PILOT`, `AIRCRAFT`, `ZONE` проходять. Граничні значення curfew (початок і кінець, вікно, що лише зачепляє curfew, перетин півночі) і зони з іншим `rule_reference` (`ZC-2026.1 §3`) тут не перевіряються — це окремі кейси. Текст `message` у docs не зафіксований, тому в очікуваний результат не включено. Відкритих питань із `05-open-questions.md` для цього правила немає.
