from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import auth, profile, masters, services, appointments, admin

# Создание всех таблиц при старте (аналог «создать все базы данных для проекта»)
Base.metadata.create_all(bind=engine)

# Имя переменной намеренно НЕ "app", чтобы сборка воркспейса не трактовала
# этот автономный Python-проект как Chatium-роут.
fastapi_app = FastAPI(title="NailStudio API", version="1.0.0")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(auth.router)
fastapi_app.include_router(profile.router)
fastapi_app.include_router(masters.router)
fastapi_app.include_router(services.router)
fastapi_app.include_router(appointments.router)
fastapi_app.include_router(admin.router)


@fastapi_app.get("/api/health")
def health():
    return {"status": "ok"}