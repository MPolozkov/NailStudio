# NailStudio — онлайн-запись на маникюр

Автономный проект на **React (фронтенд) + Python FastAPI (бэкенд) + PostgreSQL + Docker**.
Повторяет весь функционал версии на Чатиуме и запускается на любом хосте с Docker.

---

## Стек

| Слой | Технологии |
|------|-----------|
| Фронтенд | React 18, Vite, React Router, nginx |
| Бэкенд | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| БД | PostgreSQL 16 |
| Аутентификация | JWT (python-jose), пароли хешируются bcrypt (passlib) |
| Оркестрация | Docker Compose |

---

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone https://github.com/MPolozkov/NailStudio.git
cd NailStudio

# 2. Поднять все сервисы (создаст БД и таблицы автоматически)
docker compose up --build

# 3. Открыть фронтенд
# http://localhost:3000
# API: http://localhost:8000/docs (Swagger)
```

При старте бэкенда `Base.metadata.create_all()` создаёт все таблицы в PostgreSQL.
Для наполнения демо-данными выполни (внутри контейнера бэкенда):

```bash
docker compose exec backend python -m seed
```

Демо-данные:
- **Админ:** `admin@nailstudio.ru` / `admin123`
- **Мастера:** `anna@nailstudio.ru`, `maria@nailstudio.ru`, `elena@nailstudio.ru` / `master123`
- **Клиенты:** `olga@nailstudio.ru`, `dmitry@nailstudio.ru`, `natalia@nailstudio.ru` / `client123`

---

## Роли

- **User** — клиент (по умолчанию при регистрации).
- **Staff** — мастер (назначается админом при одобрении заявки).
- **Admin** — единственный администратор (регистрируется один раз).

---

## Структура проекта

```
NailStudio/
├── docker-compose.yml        # оркестрация: db + backend + frontend
├── .gitignore
├── README.md                 # этот файл
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── seed.py               # демо-данные (идемпотентный)
│   └── app/
│       ├── main.py           # создание таблиц, CORS, подключение роутеров
│       ├── config.py         # настройки (БД, JWT, CORS)
│       ├── database.py       # engine, session, Base
│       ├── models.py         # таблицы: users, masters, services, appointments
│       ├── schemas.py        # Pydantic-схемы
│       ├── security.py       # хеширование паролей + JWT
│       ├── deps.py           # зависимости: get_current_user, require_role
│       ├── notifications.py  # уведомления мастера: email (SMTP) + Telegram
│       └── routers/
│           ├── auth.py       # регистрация/вход
│           ├── profile.py    # личный кабинет клиента
│           ├── masters.py    # мастера: заявка, профиль, одобрение, удаление
│           ├── services.py   # услуги мастера
│           ├── appointments.py # записи, слоты времени
│           └── admin.py      # админ: overview, регистрация, сообщения
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css
        ├── api/client.js         # HTTP-клиент к API
        ├── context/AuthContext.jsx # состояние авторизации
        ├── components/
        │   ├── Header.jsx        # шапка, юзер в углу
        │   ├── AuthModal.jsx     # форма входа/регистрации
        │   └── Toast.jsx         # всплывающие окна
        └── pages/
            ├── Home.jsx          # лендинг «Наши мастера»
            ├── MasterPage.jsx    # страница мастера + запись
            ├── Profile.jsx       # личный кабинет клиента
            ├── MasterCabinet.jsx # кабинет мастера
            └── AdminCabinet.jsx  # админ-панель
```

---

## База данных (таблицы)

### `users`
| Поле | Описание |
|------|----------|
| id | PK |
| email | уникальный, используется для проверки пользователя |
| hashed_password | bcrypt-хеш пароля (сам пароль не хранится) |
| first_name / last_name | имя / фамилия |
| phone | телефон |
| phone_confirmed | подтверждённый телефон (если есть) |
| city, bio | город, «о себе» |
| image | фото (base64) |
| role | User / Staff / Admin |

### `masters`
| Поле | Описание |
|------|----------|
| id | PK |
| user_id | FK на users |
| name, specialty, experience, about | данные мастера |
| image | фото |
| phone | телефон (обязателен) |
| telegram_chat_id | chat_id мастера с ботом (для Telegram-уведомлений) |
| status | pending / active |

### `services`
| Поле | Описание |
|------|----------|
| id | PK |
| master_id | FK на masters |
| title | название |
| price | цена |
| duration_minutes | длительность (для расчёта слотов) |
| description, image | описание, фото |

### `appointments`
| Поле | Описание |
|------|----------|
| id | PK |
| user_id | FK на users (клиент) |
| master_id | FK на masters |
| service_id | FK на services |
| service_title | снимок названия услуги |
| amount | сумма на момент записи |
| date, time | дата и время записи |
| status | confirmed |

---

## Описание каждой функции

### Бэкенд

**`main.py`**
- `Base.metadata.create_all()` — создаёт все таблицы при старте (аналог «создать базы данных»).
- `fastapi_app` — экземпляр FastAPI, CORS, подключение всех роутеров.
- `health()` — проверка живости API.

**`config.py`**
- `Settings` — читает настройки из переменных окружения (DATABASE_URL, SECRET_KEY, срок токена, CORS).

**`database.py`**
- `engine`, `SessionLocal`, `Base`, `get_db()` — подключение к PostgreSQL и управление сессиями.

**`models.py`**
- Определяет 4 таблицы и связи между ними (User↔Master, Master↔Service, Master↔Appointment, User↔Appointment).

**`security.py`**
- `hash_password()` — хеширует пароль bcrypt (в БД хранится только хеш).
- `verify_password()` — сравнивает введённый пароль с хешем (расхеширование и проверка).
- `create_access_token()` — создаёт JWT с заданным сроком жизни.
- `decode_access_token()` — декодирует JWT, возвращает payload или None (истёкший токен).

**`deps.py`**
- `get_current_user()` — по токену возвращает пользователя; невалидный/истёкший токен → 401.
- `require_role(*roles)` — проверяет роль (например, Admin или Staff).

**`notifications.py`**
- `send_email(to_email, subject, body)` — отправка email через SMTP (smtplib). Если SMTP не настроен — логирует и возвращает False, не бросая исключение.
- `send_telegram(chat_id, text)` — отправка сообщения в Telegram через Bot API (`api.telegram.org/bot<TOKEN>/sendMessage`).
- `notify_master(master, client, service, appointment)` — уведомляет мастера о новой записи на email (адрес пользователя мастера) и в Telegram (master.telegram_chat_id). Возвращает словарь результатов по каналам.

**`routers/auth.py`**
- `POST /api/auth/register` — регистрация. Проверяет email в БД: есть → 409 «войдите», нет → создаёт пользователя, хеширует пароль, выдаёт токен.
- `POST /api/auth/login` — вход. Ищет по email, сравнивает пароль с хешем, выдаёт токен.

**`routers/profile.py`**
- `GET /api/profile/me` — данные текущего пользователя.
- `PUT /api/profile/me` — редактирование имени, фамилии, email (с проверкой на занятость), телефона, города, «о себе», фото.
- `POST /api/profile/change-password` — смена пароля; работает только если текущий пароль совпадает.

**`routers/masters.py`**
- `POST /api/masters/register` — заявка на мастера (телефон обязателен), статус pending.
- `GET /api/masters/me` / `PUT /api/masters/me` — профиль мастера текущего пользователя.
- `GET /api/masters` — публичный список активных мастеров с услугами (блок «Наши мастера»).
- `GET /api/masters/{id}` — публичная страница мастера.
- `GET /api/masters/{id}/clients` — клиенты мастера (доступ мастеру или админу).
- `POST /api/masters/{id}/approve` — одобрение админом: активация + роль Staff.
- `DELETE /api/masters/{id}` — удаление мастера админом (каскадно услуги и записи).

**`routers/services.py`**
- `GET /api/services/master/{id}` — услуги мастера.
- `POST /api/services` — мастер добавляет услугу (название, цена, длительность, описание, фото).
- `PUT /api/services/{id}` — редактирование своей услуги.
- `DELETE /api/services/{id}` — удаление своей услуги (записи на неё удаляются).

**`routers/appointments.py`**
- `POST /api/appointments` — создание записи. Проверяет принадлежность услуги мастеру, отсутствие дубликата (мастер+услуга+дата+время), и что время не 18:00 и позже. После создания вызывает `notify_master`, чтобы уведомить мастера о новой записи.
- `GET /api/appointments/my` — записи пользователя с данными мастера.
- `DELETE /api/appointments/{id}` — удаление записи (слот освобождается).
- `GET /api/appointments/slots/{master}/{service}/{date}` — свободные слоты: строятся из длительности услуги (рабочий день 10:00–18:00), занятые времена исключаются.

**`routers/admin.py`**
- `GET /api/admin/status` — зарегистрирован ли админ.
- `POST /api/admin/register` — регистрация админа только один раз; создаёт профиль мастера, чтобы админ был в «Наши мастера».
- `GET /api/admin/overview` — все мастера с услугами и клиентами.
- `POST /api/admin/message` — отправка сообщения мастеру на email и в Telegram (через `notifications`); не блокирует выполнение, если каналы не настроены.

**`seed.py`**
- Идемпотентный сид: админ, 3 мастера, 3 клиента, услуги, записи.

### Фронтенд

**`api/client.js`** — HTTP-клиент: хранит JWT в localStorage, подставляет заголовок `Authorization`, методы для всех API.

**`context/AuthContext.jsx`** — состояние пользователя, `login`, `register`, `logout`, `loadMe`.

**`components/Header.jsx`** — шапка: логотип, ссылки «Кабинет мастера» (Staff/Admin) и «Админка» (Admin), справа вверху — имя, фамилия и фото пользователя; если не авторизован — кнопка «Вход». `avatarSrc()` — заглушка «Фото будет добавлено позже», если фото нет.

**`components/AuthModal.jsx`** — модальное окно входа/регистрации по центру экрана с прозрачной подложкой. Регистрация: имя, фамилия, email, телефон, пароль, повтор пароля (все обязательны, пароли проверяются). Вход: email + пароль.

**`components/Toast.jsx`** — всплывающее окно для сообщений об успехе/ошибке.

**`pages/Home.jsx`** — лендинг «Наши мастера»: карточки мастеров с фото, услугами, кнопкой «Подробнее» (раскрывает описание), средней ценой (у каждого и общая в hero).

**`pages/MasterPage.jsx`** — страница мастера + флоу записи:
- Шаг 1 — выбор услуги.
- Шаг 2 — календарь (прошедшие месяцы не кликабельны, в текущем — только сегодня и будущие дни, будущие открыты; заполненность дня в % цветом) + время (слоты из длительности услуги, занятые пропадают, 18:00 и позже недоступно).
- Шаг 3 — подтверждение (мастер, услуга, цена, дата, время).
- Если не авторизован — сначала окно входа/регистрации.

**`pages/Profile.jsx`** — личный кабинет клиента: редактирование данных + фото, смена пароля (проверка совпадения), «Мои записи» с удалением (слот освобождается), «Мои мастера» с переходом на их страницы. Тосты об успехе/ошибке.

**`pages/MasterCabinet.jsx`** — кабинет мастера: если нет профиля — анкета (телефон обязателен), после одобрения — редактирование профиля + фото + поле Telegram chat_id, «Мои клиенты» (с фото), «Мои услуги» (добавление через модалку с длительностью от 30 мин + своё значение, ценой, фото, описанием; удаление с подтверждением).

**`pages/AdminCabinet.jsx`** — админ-панель: форма входа/регистрации (регистрация только один раз), после входа — все мастера с услугами и клиентами, одобрение заявок, удаление мастеров, отправка сообщений.

---

## Как скрыть «Кабинет мастера» и «Админку» от обычных пользователей

Уже реализовано через роли:
- «Кабинет мастера» виден только Staff/Admin.
- «Админка» видна только Admin.
- На сервере `require_role` защищает роуты — даже прямой переход по URL даст 403.

Дополнительно можно:
- Убрать ссылки из шапки и давать доступ только по URL (`/master`, `/admin`).
- Вынести разделы в отдельное меню у аватара.

---

## Деплой на хост

### Вариант 1 — Docker Compose на VPS (рекомендуется)

```bash
# на сервере с установленными Docker и Docker Compose
git clone https://github.com/MPolozkov/NailStudio.git
cd NailStudio
docker compose up -d --build
```

Открыть порты 3000 (фронт) и 8000 (API). Для продакшена поменяй `SECRET_KEY` в `docker-compose.yml`.

### Вариант 2 — Раздельный запуск

**Бэкенд:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://nailstudio:nailstudio@localhost:5432/nailstudio
uvicorn app.main:fastapi_app --host 0.0.0.0 --port 8000
```

**Фронтенд (dev):**
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

**Фронтенд (prod):**
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run build
# раздать dist/ через nginx
```

### Вариант 3 — Домен + TLS

Настрой nginx как reverse proxy:
- `http://localhost:3000` → фронт
- `http://localhost:8000` → API
- Подключи Let's Encrypt (certbot) для HTTPS.
- В `frontend/src/api/client.js` замени `VITE_API_URL` на `https://ваш-домен/api` и пересобери фронт.

---

## Уведомления мастера (email + Telegram)

При создании новой записи мастеру автоматически отправляется уведомление:
- **Email** — на адрес пользователя, связанного с мастером (через SMTP);
- **Telegram** — в чат мастера, если в профиле мастера указан `telegram_chat_id` (через Bot API).

### Настройка SMTP (email)
В `docker-compose.yml` (секция `backend.environment`) укажи:
```yaml
SMTP_HOST: smtp.yandex.ru        # или smtp.gmail.com и т.п.
SMTP_PORT: 587
SMTP_USER: your@mail.ru
SMTP_PASSWORD: your-password     # для Gmail — app password
SMTP_FROM: your@mail.ru
SMTP_USE_TLS: "true"
```

### Настройка Telegram-бота
1. Создай бота через @BotFather в Telegram и получи токен.
2. В `docker-compose.yml` укажи `TELEGRAM_BOT_TOKEN: <токен>`.
3. Мастер должен написать вашему боту (например, `/start`), чтобы получить свой `chat_id`.
4. Укажи этот `chat_id` в профиле мастера в поле «Telegram chat_id».

> Уведомления безопасны: если канал не настроен или отправка не удалась, запись всё равно создаётся, а ошибка логируется.

---

## Примечания

- Пароли хранятся только в виде bcrypt-хеша; JWT-токен истекает (по умолчанию 60 мин) — пользователь автоматически «выходит».
- Уведомления мастера о записи и сообщения админа отправляются через модуль `notifications.py` (email + Telegram).