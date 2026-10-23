# Ревью E2E-OP-002: соответствует

**Кейс:** `test-cases/auth/E2E-OP-002.md` · **Дата:** 2026-10-23

| Пункт | Вердикт | Источник | Комментарий |
|---|---|---|---|
| Doc ref | соответствует | `04-frontend-spec.md#Operator portal` (стр. 16), `04-frontend-spec.md#Two contracts to hold exactly` (стр. 49), `03-api-contract.md#Authentication & authorisation` (стр. 14), `app/login/page.tsx`, `components/AppHeader.tsx` | Все разделы и оба файла кода существуют. |
| Preconditions | соответствует | `01-data-model.md#Enumerations` (стр. 130), `03-api-contract.md#Authentication & authorisation` (стр. 20), `04-frontend-spec.md#Two contracts to hold exactly` (стр. 61–62), `components/AppHeader.tsx:64-73` | `ACTIVE` — допустимое значение `Operator.status` («`ACTIVE`, `SUSPENDED`»). Регистрация через `POST /operators`. Ссылки `operator-login-link` / `operator-register-link` по docs показываются, «when logged out», в коде — при `operator === null` вне `/reviewer`. Требований к паролю в docs нет, так что `Sky-Permit-2026` им не противоречит. |
| Step 1 | соответствует | `04-frontend-spec.md#Operator portal` («**Login** (`/login`)»), `components/AppHeader.tsx:66` | Ссылка `operator-login-link` с `href="/login"` есть. |
| Step 2 | соответствует | `04-frontend-spec.md#Two contracts to hold exactly` («Every interactive element carries a `data-testid`»), `app/login/page.tsx:40`, `app/login/page.tsx:48` | Поля `operator-login-email-input` и `operator-login-password-input` есть в коде. В docs названия этих полей не закреплены, но и не противоречат. Вход по email + password подтверждён в `03#Authentication & authorisation` («Log in with email + password»). |
| Step 3 | соответствует | `03-api-contract.md#Authentication & authorisation` (стр. 21), `app/login/page.tsx:58`, `app/login/page.tsx:22`, `app/api/v1/auth/login/route.ts:9-39` | Кнопка `operator-login-submit-button` есть. Отправка вызывает `POST /auth/login`, при успехе возвращается `200` с профилем оператора. |
| Expected result | соответствует | `04-frontend-spec.md#Two contracts to hold exactly` (стр. 61–63), `03-api-contract.md#Authentication & authorisation` («sets the session cookie») | По docs `operator-session-info` / `operator-logout-button` «shown when logged in», а `operator-login-link` / `operator-register-link` — «shown when logged out». Testid `operator-login-error` в docs не упомянут; он есть только в коде (`app/login/page.tsx:54`). Утверждение «ошибка не появляется» логически следует из успешного входа. |

**Итог:** соответствует. Каждое утверждение кейса подтверждается разделами `03` и `04`, а все `data-testid` из шагов и ожидаемого результата есть в коде.

**Расхождения docs ↔ код:** Нет прямых расхождений. Есть неявная зависимость от поведения кода: `components/AppHeader.tsx:75` показывает `operator-session-info` / `operator-logout-button` только на маршрутах `/operator*` (`inOperator && operator`). Ожидаемый результат выполняется лишь потому, что после входа код перенаправляет на `/operator/pilots` (`app/login/page.tsx:26`). В docs нет ни такого редиректа, ни правила, что блок сессии виден только в `/operator*`. Если редирект поменяют (например, на `/`), шапка не покажет `operator-session-info`, хотя docs требуют показывать его, «when logged in».

**Рекомендации:**
- В Rationale ссылка на `05-open-questions.md#1` (Q4) для `SUSPENDED` неточна. По `05#1` и `07#3`, `SUSPENDED` — это «precondition on write operations (create, submit, approve)». Про вход там ничего не сказано. Лучше формулировать так: «поведение входа для `SUSPENDED` в docs не описано; ответ для заблокированных записей — открытый вопрос Q4».
- Уточнить у владельца требований, должен ли блок сессии (`operator-session-info` / `operator-logout-button`) показываться в шапке на всех страницах или только в `/operator*`, и куда должен вести редирект после входа.
- Предложить закрепить в `04#Two contracts to hold exactly` testid формы входа (`operator-login-email-input`, `operator-login-password-input`, `operator-login-submit-button`, `operator-login-error`). Сейчас они существуют только в коде.
