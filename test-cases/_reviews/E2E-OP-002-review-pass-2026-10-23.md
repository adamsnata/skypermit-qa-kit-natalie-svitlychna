# Ревʼю E2E-OP-002: відповідає

**Кейс:** `test-cases/auth/E2E-OP-002.md` · **Дата:** 2026-10-23

| Пункт | Вердикт | Джерело | Коментар |
|---|---|---|---|
| Doc ref | відповідає | `04-frontend-spec.md#Operator portal` (рядок 16), `04-frontend-spec.md#Two contracts to hold exactly` (рядок 49), `03-api-contract.md#Authentication & authorisation` (рядок 14), `app/login/page.tsx`, `components/AppHeader.tsx` | Усі розділи й обидва файли коду існують. |
| Preconditions | відповідає | `01-data-model.md#Enumerations` (рядок 130), `03-api-contract.md#Authentication & authorisation` (рядок 20), `04-frontend-spec.md#Two contracts to hold exactly` (рядки 61–62), `components/AppHeader.tsx:64-73` | `ACTIVE` — допустиме значення `Operator.status` («`ACTIVE`, `SUSPENDED`»). Реєстрація через `POST /operators`. Посилання `operator-login-link` / `operator-register-link` за docs показуються «when logged out», у коді — за `operator === null` поза `/reviewer`. Вимог до пароля в docs немає, тож `Sky-Permit-2026` їм не суперечить. |
| Step 1 | відповідає | `04-frontend-spec.md#Operator portal` («**Login** (`/login`)»), `components/AppHeader.tsx:66` | Посилання `operator-login-link` з `href="/login"` є. |
| Step 2 | відповідає | `04-frontend-spec.md#Two contracts to hold exactly` («Every interactive element carries a `data-testid`»), `app/login/page.tsx:40`, `app/login/page.tsx:48` | Поля `operator-login-email-input` і `operator-login-password-input` є в коді. У docs назви цих полів не закріплені, але й не суперечать. Вхід за email + password підтверджено в `03#Authentication & authorisation` («Log in with email + password»). |
| Step 3 | відповідає | `03-api-contract.md#Authentication & authorisation` (рядок 21), `app/login/page.tsx:58`, `app/login/page.tsx:22`, `app/api/v1/auth/login/route.ts:9-39` | Кнопка `operator-login-submit-button` є. Надсилання викликає `POST /auth/login`, у разі успіху повертається `200` з профілем оператора. |
| Expected result | відповідає | `04-frontend-spec.md#Two contracts to hold exactly` (рядки 61–63), `03-api-contract.md#Authentication & authorisation` («sets the session cookie») | За docs `operator-session-info` / `operator-logout-button` «shown when logged in», а `operator-login-link` / `operator-register-link` — «shown when logged out». Testid `operator-login-error` у docs не згадано; він є лише в коді (`app/login/page.tsx:54`). Твердження «помилка не зʼявляється» логічно випливає з успішного входу. |

**Підсумок:** відповідає. Кожне твердження кейсу підтверджується розділами `03` і `04`, а всі `data-testid` з кроків і очікуваного результату є в коді.

**Розбіжності docs ↔ код:** Прямих розбіжностей немає. Є неявна залежність від поведінки коду: `components/AppHeader.tsx:75` показує `operator-session-info` / `operator-logout-button` лише на маршрутах `/operator*` (`inOperator && operator`). Очікуваний результат виконується лише тому, що після входу код перенаправляє на `/operator/pilots` (`app/login/page.tsx:26`). У docs немає ні такого редиректу, ні правила, що блок сесії видно лише в `/operator*`. Якщо редирект змінять (наприклад, на `/`), шапка не покаже `operator-session-info`, хоча docs вимагають показувати його «when logged in».

**Рекомендації:**
- У Rationale посилання на `05-open-questions.md#1` (Q4) для `SUSPENDED` неточне. За `05#1` і `07#3`, `SUSPENDED` — це «precondition on write operations (create, submit, approve)». Про вхід там нічого не сказано. Краще формулювати так: «поведінку входу для `SUSPENDED` у docs не описано; відповідь для заблокованих записів — відкрите питання Q4».
- Уточнити у власника вимог, чи має блок сесії (`operator-session-info` / `operator-logout-button`) показуватися в шапці на всіх сторінках чи лише в `/operator*`, і куди має вести редирект після входу.
- Запропонувати закріпити в `04#Two contracts to hold exactly` testid форми входу (`operator-login-email-input`, `operator-login-password-input`, `operator-login-submit-button`, `operator-login-error`). Зараз вони існують лише в коді.
