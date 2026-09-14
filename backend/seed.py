"""Сид демо-данных NailStudio. Идемпотентный: повторный запуск не дублирует данные.

Запуск: python -m seed  (из папки backend/)
"""
from datetime import date, time

from app.database import Base, engine, SessionLocal
from app.models import User, Master, Service, Appointment
from app.security import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---- Администратор (единственный) ----
    admin = db.query(User).filter(User.email == "admin@nailstudio.ru").first()
    if not admin:
        admin = User(
            email="admin@nailstudio.ru",
            hashed_password=hash_password("admin123"),
            first_name="Администратор",
            last_name="NailStudio",
            role="Admin",
        )
        db.add(admin)
        db.flush()
        # У админа автоматически профиль мастера, чтобы он был в «Наши мастера»
        admin_master = Master(user_id=admin.id, name="Администратор NailStudio", status="active")
        db.add(admin_master)
        db.flush()
        db.add(Service(master_id=admin_master.id, title="Маникюр с покрытием", price=1500, duration_minutes=90, description="Классический маникюр + гель-лак"))
        db.add(Service(master_id=admin_master.id, title="Педикюр комплексный", price=1900, duration_minutes=120, description="Полный педикюр с покрытием"))
        db.add(Service(master_id=admin_master.id, title="Наращивание ногтей", price=2200, duration_minutes=150, description="Наращивание гелем любой длины"))

    # ---- Мастера ----
    masters_data = [
        {"email": "anna@nailstudio.ru", "name": "Анна Смирнова", "specialty": "Маникюр и педикюр", "experience": "7 лет", "about": "Специализируюсь на европейском и аппаратном маникюре."},
        {"email": "maria@nailstudio.ru", "name": "Мария Иванова", "specialty": "Наращивание ногтей", "experience": "5 лет", "about": "Мастер по наращиванию и художественному дизайну."},
        {"email": "elena@nailstudio.ru", "name": "Елена Петрова", "specialty": "Аппаратный маникюр", "experience": "9 лет", "about": "Аппаратный маникюр и укрепление ногтевой пластины."},
    ]
    master_objs = []
    for md in masters_data:
        u = db.query(User).filter(User.email == md["email"]).first()
        if not u:
            u = User(
                email=md["email"],
                hashed_password=hash_password("master123"),
                first_name=md["name"].split()[0],
                last_name=md["name"].split()[1],
                phone="+7 900 000-00-00",
                role="Staff",
            )
            db.add(u)
            db.flush()
        m = db.query(Master).filter(Master.user_id == u.id).first()
        if not m:
            m = Master(
                user_id=u.id,
                name=md["name"],
                specialty=md["specialty"],
                experience=md["experience"],
                about=md["about"],
                phone="+7 900 000-00-00",
                status="active",
            )
            db.add(m)
            db.flush()
        master_objs.append(m)

    # Услуги мастеров
    services_map = {
        "Анна": [("Маникюр классический", 1200, 60), ("Маникюр + гель-лак", 1500, 90), ("Педикюр", 1700, 90)],
        "Мария": [("Наращивание", 2000, 120), ("Дизайн ногтей", 900, 60)],
        "Елена": [("Аппаратный маникюр", 1300, 60), ("Укрепление гелем", 1100, 60)],
    }
    for m in master_objs:
        if db.query(Service).filter(Service.master_id == m.id).count() == 0:
            for title, price, dur in services_map.get(m.name.split()[0], []):
                db.add(Service(master_id=m.id, title=title, price=price, duration_minutes=dur, description=f"Услуга «{title}» от мастера {m.name}"))

    # ---- Клиенты ----
    clients_data = [
        {"email": "olga@nailstudio.ru", "first": "Ольга", "last": "Кузнецова", "phone": "+7 911 111-11-11"},
        {"email": "dmitry@nailstudio.ru", "first": "Дмитрий", "last": "Соколов", "phone": "+7 922 222-22-22"},
        {"email": "natalia@nailstudio.ru", "first": "Наталья", "last": "Морозова", "phone": "+7 933 333-33-33"},
    ]
    client_objs = []
    for cd in clients_data:
        u = db.query(User).filter(User.email == cd["email"]).first()
        if not u:
            u = User(
                email=cd["email"],
                hashed_password=hash_password("client123"),
                first_name=cd["first"],
                last_name=cd["last"],
                phone=cd["phone"],
                role="User",
            )
            db.add(u)
            db.flush()
        client_objs.append(u)

    # ---- Записи клиентов к мастерам ----
    if db.query(Appointment).count() == 0 and master_objs:
        for i, client in enumerate(client_objs):
            m = master_objs[i % len(master_objs)]
            svc = db.query(Service).filter(Service.master_id == m.id).first()
            if svc:
                db.add(Appointment(
                    user_id=client.id,
                    master_id=m.id,
                    service_id=svc.id,
                    service_title=svc.title,
                    amount=svc.price,
                    date=date(2026, 9, 20),
                    time=time(11, 0),
                ))

    db.commit()
    db.close()
    print("Seed завершён: админ, 3 мастера, 3 клиента, услуги и записи созданы.")


if __name__ == "__main__":
    seed()