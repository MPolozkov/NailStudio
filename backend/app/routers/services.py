from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Master, Service, Appointment
from ..schemas import ServiceIn, ServiceOut
from ..deps import get_current_user

router = APIRouter(prefix="/api/services", tags=["services"])


def _get_own_master(user: User, db: Session) -> Master:
    master = db.query(Master).filter(Master.user_id == user.id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Профиль мастера не найден")
    return master


@router.get("/master/{master_id}", response_model=list[ServiceOut])
def list_master_services(master_id: int, db: Session = Depends(get_db)):
    """Публичный список услуг конкретного мастера."""
    return db.query(Service).filter(Service.master_id == master_id).all()


@router.post("", response_model=ServiceOut)
def create_service(data: ServiceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Мастер добавляет услугу (название, цена, длительность, описание, изображение)."""
    master = _get_own_master(user, db)
    service = Service(
        master_id=master.id,
        title=data.title,
        price=data.price,
        duration_minutes=data.duration_minutes,
        description=data.description,
        image=data.image,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, data: ServiceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Мастер редактирует свою услугу."""
    master = _get_own_master(user, db)
    service = db.query(Service).filter(Service.id == service_id, Service.master_id == master.id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    for field, value in data.model_dump().items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}")
def delete_service(service_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Мастер удаляет свою услугу. Записи на неё тоже удаляются (слоты освобождаются)."""
    master = _get_own_master(user, db)
    service = db.query(Service).filter(Service.id == service_id, Service.master_id == master.id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    db.query(Appointment).filter(Appointment.service_id == service_id).delete()
    db.delete(service)
    db.commit()
    return {"detail": "Услуга удалена"}