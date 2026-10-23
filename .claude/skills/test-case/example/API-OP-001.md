# API-OP-001: POST /operators з authorisation_level = L3 → оператора створено з L1

**Doc ref:** `03-api-contract.md#Authentication & authorisation`, `04-frontend-spec.md#Operator portal`, `01-data-model.md#Enumerations`, `app/api/v1/operators/route.ts`
**Role(s):** Operator (до реєстрації — без session cookie і без `X-Reviewer-Id`)
**Preconditions:**
- Оператора з email `api-op-001@example.com` і `national_id` `API-OP-001-NID` у системі немає.

**Steps:**
1. Надіслати `POST /api/v1/operators` з тілом `{"email": "api-op-001@example.com", "password": "Sky-Permit-2026", "legal_name": "API OP 001 Ltd", "national_id": "API-OP-001-NID", "authorisation_level": "L3"}`.

**Expected result:** Оператора створено; у тілі відповіді `authorisation_level` = `L1` (не `L3`). Точний код успішної відповіді в docs не вказано — `TODO: уточнити за вимогами`.

**Rationale:** Негативна перевірка на підвищення привілеїв: за `03#Authentication & authorisation` «`authorisation_level` is no longer self-service. Registration always creates an operator at `L1`», значення з тіла запиту має ігноруватися. Обрано `L3` — максимальний рівень з `01#Enumerations`, найнебезпечніший клас. Код повертає `created(operator)` (`app/api/v1/operators/route.ts`), але код відповіді в docs не зафіксовано, тому в очікуваний результат не включено.
