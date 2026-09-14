from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import RegisterIn, LoginIn, TokenOut, UserOut
from ..security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """Регистрация. Проверяет пользователя по email в БД:
    если есть — 409 (нужно войти), если нет — создаёт и сразу выдаёт токен."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует. Войдите.")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role="User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    """Вход. Ищет пользователя по email, сравнивает пароль с хешем из БД."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(lambda: None)):
    # Заглушка: реальный /me реализован в profile.py через get_current_user.
    raise HTTPException(status_code=501, detail="Use /api/profile/me")