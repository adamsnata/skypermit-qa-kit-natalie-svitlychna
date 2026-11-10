# API-OP-001: POST /operators з authorisation_level вище L1 → оператора створено з L1

**Doc ref:** `SD/03 — API Contract#Authentication & authorisation`, `SD/04 — Frontend Scope#Operator portal`, `SD/01 — Data Model#Enumerations`, `app/api/v1/operators/route.ts`
**Role(s):** Operator (до реєстрації — без session cookie і без `X-Reviewer-Id`)
**Preconditions:**
- Оператора з унікальним email і унікальним `national_id` (значення — вигадані тестові, нові для кожного прогону) у системі немає.

**Steps:**
1. Надіслати `POST /api/v1/operators` з тілом, де всі обовʼязкові поля валідні (унікальні email і `national_id`, пароль довший за мінімальну довжину, `legal_name`), а `authorisation_level` дорівнює максимальному значенню з `SD/01#Enumerations`.

**Expected result:** Оператора створено; у тілі відповіді `authorisation_level` = `L1` (не значення із запиту). Точний код успішної відповіді в docs не вказано — `TODO: уточнити за вимогами`.

**Rationale:** Негативна перевірка на підвищення привілеїв: за `SD/03#Authentication & authorisation` «`authorisation_level` is no longer self-service. Registration always creates an operator at `L1`», значення з тіла запиту має ігноруватися. Для запиту обирають максимальний рівень з `SD/01#Enumerations` — найнебезпечніший клас. Код повертає `created(operator)` (`app/api/v1/operators/route.ts`), але код відповіді в docs не зафіксовано, тому в очікуваний результат не включено.
