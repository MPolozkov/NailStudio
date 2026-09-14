from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserOut, ProfileUpdate, ChangePasswordIn
from ..security import hash_password, verify_password
from ..deps import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    """Возвращает данные текущего пользователя."""
    return user


@router.put("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Редактирование профиля: имя, фамилия, email, телефон, город, о себе, фото."""
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Этот email уже занят другим пользователем")
        user.email = data.email
    if data.phone is not None:
        user.phone = data.phone
    if data.city is not None:
        user.city = data.city
    if data.bio is not None:
        user.bio = data.bio
    if data.image is not None:
        user.image = data.image
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(data: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Смена пароля. Работает только если текущий пароль совпадает."""
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Текущий пароль неверен")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"detail": "Пароль успешно изменён"}