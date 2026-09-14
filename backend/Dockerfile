# Dockerfile для backend

# Используем базовый образ Python
FROM python:3.9-slim-buster

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл зависимостей
COPY requirements.txt ./

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем остальной код приложения
COPY . .

# Команда для запуска Uvicorn (как в вашей ошибке)
CMD ["uvicorn", "app.main:fastapi_app", "--host", "0.0.0.0", "--port", "8000"]