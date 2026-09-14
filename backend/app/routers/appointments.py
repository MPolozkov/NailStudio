from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import User, Master, Service, Appointment
from ..schemas import AppointmentIn, AppointmentOut, AppointmentUpdate, MasterOut, ServiceOut
from ..deps import get_current_user
from ..notifications import notify_master

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

WORKDAY_START = 10  # 10:00
WORKDAY_END = 18  # последний слот начинается не позже 18:00


def _master_out(m: Master) -> MasterOut:
    return MasterOut(
        id=m.id, user_id=m.user_id, name=m.name, specialty=m.specialty,
        experience=m.experience, about=m.about, image=m.image, phone=m.phone,
        status=m.status, services=[ServiceOut.model_validate(s) for s in m.services],
    )


@router.post("", response_model=AppointmentOut)
def create_appointment(data: AppointmentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Создание записи. Проверяет, что услуга принадлежит мастеру, и что на это время нет другой записи."""
    service = db.query(Service).filter(Service.id == data.service_id).first()
    if not service or service.master_id != data.master_id:
        raise HTTPException(status_code=400, detail="Услуга не принадлежит выбранному мастеру")

    # Проверка на одинаковые записи (тот же мастер + услуга + дата + время)
    duplicate = (
        db.query(Appointment)
        .filter(
            Appointment.master_id == data.master_id,
            Appointment.service_id == data.service_id,
            Appointment.date == data.date,
            Appointment.time == data.time,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Такая запись уже существует на это время")

    # Проверка слота времени: запись на 18:00 и позже недоступна
    if data.time.hour >= WORKDAY_END:
        raise HTTPException(status_code=400, detail="Запись на 18:00 и позже недоступна")

    appointment = Appointment(
        user_id=user.id,
        master_id=data.master_id,
        service_id=service.id,
        service_title=service.title,
        amount=service.price,
        date=data.date,
        time=data.time,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    # Загружаем мастера вместе с его пользователем (для email уведомления)
    master = (
        db.query(Master)
        .options(joinedload(Master.user), joinedload(Master.services))
        .filter(Master.id == data.master_id)
        .first()
    )
    appointment.master = master
    # Уведомляем мастера о новой записи на все доступные контакты (email/Telegram)
    notify_master(master, user, service, appointment)
    return appointment


@router.get("/my", response_model=list[AppointmentOut])
def my_appointments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Список записей текущего пользователя с данными мастера."""
    rows = (
        db.query(Appointment)
        .options(joinedload(Appointment.master).joinedload(Master.services))
        .filter(Appointment.user_id == user.id)
        .order_by(Appointment.date.desc(), Appointment.time.desc())
        .all()
    )
    # Строим ответ явно, не подменяя ORM-атрибут master pydantic-объектом
    # (подмена relationship-атрибута ломает сериализацию и даёт 500).
    result = []
    for a in rows:
        result.append(AppointmentOut(
            id=a.id,
            user_id=a.user_id,
            master_id=a.master_id,
            service_id=a.service_id,
            service_title=a.service_title,
            amount=a.amount,
            date=a.date,
            time=a.time,
            status=a.status,
            master=_master_out(a.master) if a.master else None,
        ))
    return result


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: int, data: AppointmentUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Перенос записи: изменение даты и времени. Проверяет, что новое время свободно."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if appointment.user_id != user.id and user.role != "Admin":
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    if data.time.hour >= WORKDAY_END:
        raise HTTPException(status_code=400, detail="Запись на 18:00 и позже недоступна")
    duplicate = (
        db.query(Appointment)
        .filter(
            Appointment.master_id == appointment.master_id,
            Appointment.service_id == appointment.service_id,
            Appointment.date == data.date,
            Appointment.time == data.time,
            Appointment.id != appointment.id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Это время уже занято. Выберите другое.")
    appointment.date = data.date
    appointment.time = data.time
    db.commit()
    db.refresh(appointment)
    master = (
        db.query(Master)
        .options(joinedload(Master.services))
        .filter(Master.id == appointment.master_id)
        .first()
    )
    return AppointmentOut(
        id=appointment.id,
        user_id=appointment.user_id,
        master_id=appointment.master_id,
        service_id=appointment.service_id,
        service_title=appointment.service_title,
        amount=appointment.amount,
        date=appointment.date,
        time=appointment.time,
        status=appointment.status,
        master=_master_out(master) if master else None,
    )


@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Удаление записи пользователем. Слот времени на услугу/дату освобождается."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if appointment.user_id != user.id and user.role != "Admin":
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    db.delete(appointment)
    db.commit()
    return {"detail": "Запись удалена"}


@router.get("/slots/{master_id}/{service_id}/{date}")
def get_slots(master_id: int, service_id: int, date: str, db: Session = Depends(get_db)):
    """Возвращает свободные слоты времени на дату для услуги мастера.
    Слоты строятся из длительности услуги; занятые времена исключаются."""
    service = db.query(Service).filter(Service.id == service_id, Service.master_id == master_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    # Параметр даты приходит строкой; приводим к типу DATE, иначе PostgreSQL
    # не сможет сравнить колонку date с текстом (operator does not exist: date = text).
    try:
        parsed_date = date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректная дата")
    duration = max(30, service.duration_minutes or 60)
    taken = [
        a.time.strftime("%H:%M")
        for a in db.query(Appointment).filter(
            Appointment.master_id == master_id,
            Appointment.service_id == service_id,
            Appointment.date == parsed_date,
        ).all()
    ]
    slots = []
    t = WORKDAY_START * 60
    while t + duration <= WORKDAY_END * 60:
        hh, mm = divmod(t, 60)
        label = f"{hh:02d}:{mm:02d}"
        if label not in taken:
            slots.append(label)
        t += 30
    return {"slots": slots, "taken": taken}