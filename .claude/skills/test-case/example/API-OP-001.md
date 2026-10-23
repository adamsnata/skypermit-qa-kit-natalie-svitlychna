# API-OP-001: POST /operators с authorisation_level = L3 → оператор создан с L1

**Doc ref:** `03-api-contract.md#Authentication & authorisation`, `04-frontend-spec.md#Operator portal`, `01-data-model.md#Enumerations`, `app/api/v1/operators/route.ts`
**Role(s):** Operator (до регистрации — без session cookie и без `X-Reviewer-Id`)
**Preconditions:**
- Оператора с email `api-op-001@example.com` и `national_id` `API-OP-001-NID` в системе нет.

**Steps:**
1. Отправить `POST /api/v1/operators` с телом `{"email": "api-op-001@example.com", "password": "Sky-Permit-2026", "legal_name": "API OP 001 Ltd", "national_id": "API-OP-001-NID", "authorisation_level": "L3"}`.

**Expected result:** Оператор создан; в теле ответа `authorisation_level` = `L1` (не `L3`). Точный код успешного ответа в docs не указан — `TODO: уточнить по требованиям`.

**Rationale:** Негативная проверка на повышение привилегий: по `03#Authentication & authorisation` «`authorisation_level` is no longer self-service. Registration always creates an operator at `L1`», значение из тела запроса должно игнорироваться. Выбрано `L3` — максимальный уровень из `01#Enumerations`, самый опасный класс. Код возвращает `created(operator)` (`app/api/v1/operators/route.ts`), но код ответа в docs не зафиксирован, поэтому в ожидаемый результат не включён.
