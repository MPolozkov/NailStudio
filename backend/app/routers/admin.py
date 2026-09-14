from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import User, Master, Service, Appointment
from ..schemas import AdminMessageIn, AdminRegisterIn, TokenOut, UserOut, MasterOut, ServiceOut
from ..security import hash_password, create_access_token
from ..deps import require_role
from ..notifications import send_email, send_telegram

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _master_out(m: Master) -> MasterOut:
    return MasterOut(
        id=m.id, user_id=m.user_id, name=m.name, specialty=m.specialty,
        experience=m.experience, about=m.about, image=m.image, phone=m.phone,
        status=m.status, services=[ServiceOut.model_validate(s) for s in m.services],
    )


@router.get("/status")
def admin_status(db: Session = Depends(get_db)):
    """Возвращает, зарегистрирован ли уже администратор (регистрация только один раз)."""
    admin = db.query(User).filter(User.role == "Admin").first()
    return {"registered": admin is not None}


@router.post("/register", response_model=TokenOut)
def register_admin(data: AdminRegisterIn, db: Session = Depends(get_db)):
    """Регистрация администратора. Доступна только один раз: если админ уже есть — 409."""
    existing_admin = db.query(User).filter(User.role == "Admin").first()
    if existing_admin:
        raise HTTPException(status_code=409, detail="Администратор уже зарегистрирован. Регистрация доступна только один раз.")
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")
    admin = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role="Admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    # У админа автоматически создаётся профиль мастера, чтобы он отображался в «Наши мастера»
    master = Master(user_id=admin.id, name=f"{admin.first_name} {admin.last_name}".strip(), status="active")
    db.add(master)
    db.commit()
    token = create_access_token(admin.id, admin.role)
    return TokenOut(access_token=token)


@router.get("/overview")
def overview(admin: User = Depends(require_role("Admin")), db: Session = Depends(get_db)):
    """Все мастера с услугами и клиентами. Доступно только админу."""
    masters = db.query(Master).options(joinedload(Master.services)).all()
    result = []
    for m in masters:
        clients_rows = (
            db.query(Appointment, User)
            .join(User, User.id == Appointment.user_id)
            .filter(Appointment.master_id == m.id)
            .all()
        )
        clients = []
        seen = {}
        for appt, client in clients_rows:
            if client.id not in seen:
                seen[client.id] = True
                clients.append({
                    "id": client.id,
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                    "email": client.email,
                    "phone": client.phone,
                    "image": client.image,
                    "appointments": [
                        {
                            "service": appt.service_title,
                            "amount": appt.amount,
                            "date": str(appt.date),
                            "time": str(appt.time),
                        }
                        for a, c in clients_rows if a.user_id == client.id
                    ],
                })
        result.append({
            "master": _master_out(m),
            "clients": clients,
        })
    return result


@router.post("/message")
def send_message(data: AdminMessageIn, admin: User = Depends(require_role("Admin")), db: Session = Depends(get_db)):
    """Отправка сообщения мастеру на email и в Telegram (если каналы настроены).
    Не блокирует выполнение, если канал не настроен или отправка не удалась."""
    master = db.query(Master).filter(Master.id == data.master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    target = db.query(User).filter(User.id == master.user_id).first()
    text = f"Сообщение от администратора NailStudio\nТема: {data.subject}\n\n{data.body}"
    results = {}
    if target and target.email:
        results["email"] = send_email(target.email, f"NailStudio: {data.subject}", text)
    if getattr(master, "telegram_chat_id", None):
        results["telegram"] = send_telegram(master.telegram_chat_id, text)
    # Дублируем в лог, чтобы было видно даже без настроенных каналов
    print(f"[ADMIN->MASTER {master.name}] subject={data.subject} body={data.body} results={results}")
    return {"detail": "Сообщение отправлено", "to": target.email if target else None, "results": results}