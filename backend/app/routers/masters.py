from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import User, Master, Service, Appointment
from ..schemas import MasterRegisterIn, MasterUpdate, MasterOut, ServiceOut, UserOut, ClientOut, ClientAppointment
from ..deps import get_current_user, require_role

router = APIRouter(prefix="/api/masters", tags=["masters"])


def _to_out(m: Master) -> MasterOut:
    return MasterOut(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        specialty=m.specialty,
        experience=m.experience,
        about=m.about,
        image=m.image,
        phone=m.phone,
        status=m.status,
        services=[ServiceOut.model_validate(s) for s in m.services],
    )


@router.post("/register", response_model=MasterOut)
def register_master(data: MasterRegisterIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Заявка на мастера. Телефон обязателен. Для отправки заявки нужна хотя бы одна услуга.
    Создаёт профиль со статусом pending и сразу добавляет услуги мастера."""
    if not data.phone.strip():
        raise HTTPException(status_code=400, detail="Телефон обязателен")
    if not data.services:
        raise HTTPException(status_code=400, detail="Добавьте хотя бы одну услугу перед отправкой заявки")
    existing = db.query(Master).filter(Master.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Профиль мастера уже существует")
    master = Master(
        user_id=user.id,
        name=data.name or f"{user.first_name} {user.last_name}".strip(),
        specialty=data.specialty,
        experience=data.experience,
        about=data.about,
        phone=data.phone,
        image=data.image,
        status="pending",
    )
    db.add(master)
    db.flush()
    for s in data.services:
        db.add(Service(
            master_id=master.id,
            title=s.title,
            price=s.price,
            duration_minutes=s.duration_minutes,
            description=s.description,
            image=s.image,
        ))
    db.commit()
    db.refresh(master)
    return _to_out(master)


@router.get("/me", response_model=MasterOut)
def get_my_master(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Возвращает профиль мастера текущего пользователя."""
    master = db.query(Master).filter(Master.user_id == user.id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Профиль мастера не найден")
    return _to_out(master)


@router.put("/me", response_model=MasterOut)
def update_my_master(data: MasterUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Редактирование профиля мастера."""
    master = db.query(Master).filter(Master.user_id == user.id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Профиль мастера не найден")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(master, field, value)
    db.commit()
    db.refresh(master)
    return _to_out(master)


@router.get("", response_model=list[MasterOut])
def list_active_masters(db: Session = Depends(get_db)):
    """Публичный список активных мастеров с их услугами (для блока «Наши мастера»)."""
    masters = (
        db.query(Master)
        .options(joinedload(Master.services))
        .filter(Master.status == "active")
        .all()
    )
    return [_to_out(m) for m in masters]


@router.get("/{master_id}", response_model=MasterOut)
def get_public_master(master_id: int, db: Session = Depends(get_db)):
    """Публичная страница конкретного мастера с услугами."""
    master = (
        db.query(Master)
        .options(joinedload(Master.services))
        .filter(Master.id == master_id)
        .first()
    )
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    return _to_out(master)


@router.get("/{master_id}/clients", response_model=list[ClientOut])
def master_clients(master_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Список клиентов мастера с их записями (доступен самому мастеру или админу)."""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    if user.role != "Admin" and master.user_id != user.id:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    rows = (
        db.query(Appointment, User)
        .join(User, User.id == Appointment.user_id)
        .filter(Appointment.master_id == master_id)
        .all()
    )
    result = []
    index = {}
    for appt, client in rows:
        if client.id not in index:
            index[client.id] = ClientOut(
                id=client.id,
                first_name=client.first_name,
                last_name=client.last_name,
                email=client.email,
                phone=client.phone,
                image=client.image,
                appointments=[],
            )
            result.append(index[client.id])
        index[client.id].appointments.append(ClientAppointment(
            service=appt.service_title,
            amount=appt.amount,
            date=str(appt.date),
            time=str(appt.time),
        ))
    return result


@router.post("/{master_id}/approve", response_model=MasterOut)
def approve_master(master_id: int, admin: User = Depends(require_role("Admin")), db: Session = Depends(get_db)):
    """Одобрение заявки мастера админом: активирует профиль и назначает роль Staff."""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    master.status = "active"
    target = db.query(User).filter(User.id == master.user_id).first()
    if target and target.role == "User":
        target.role = "Staff"
    db.commit()
    db.refresh(master)
    return _to_out(master)


@router.delete("/{master_id}")
def delete_master(master_id: int, admin: User = Depends(require_role("Admin")), db: Session = Depends(get_db)):
    """Удаление мастера админом. Каскадно удаляются его услуги и записи."""
    master = db.query(Master).filter(Master.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    db.query(Appointment).filter(Appointment.master_id == master_id).delete()
    db.query(Service).filter(Service.master_id == master_id).delete()
    db.delete(master)
    db.commit()
    return {"detail": "Мастер удалён"}