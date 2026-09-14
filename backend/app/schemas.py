from datetime import date, time
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str = ""
    last_name: str = ""
    phone: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- User / Profile ----------
class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str
    phone_confirmed: str
    city: str
    bio: str
    image: str
    role: str

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    image: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# ---------- Master ----------
class ServiceIn(BaseModel):
    title: str
    price: float = 0
    duration_minutes: int = 60
    description: str = ""
    image: str = ""


class MasterRegisterIn(BaseModel):
    name: str
    specialty: str = ""
    experience: str = ""
    about: str = ""
    phone: str
    image: str = ""
    services: list[ServiceIn] = []


class MasterUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    about: Optional[str] = None
    phone: Optional[str] = None
    image: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class ServiceOut(BaseModel):
    id: int
    master_id: int
    title: str
    price: float
    duration_minutes: int
    description: str
    image: str

    class Config:
        from_attributes = True


class MasterOut(BaseModel):
    id: int
    user_id: int
    name: str
    specialty: str
    experience: str
    about: str
    image: str
    phone: str
    telegram_chat_id: str = ""
    status: str
    services: list[ServiceOut] = []

    class Config:
        from_attributes = True


# ---------- Appointment ----------
class AppointmentIn(BaseModel):
    master_id: int
    service_id: int
    date: date
    time: time


class AppointmentOut(BaseModel):
    id: int
    user_id: int
    master_id: int
    service_id: int
    service_title: str
    amount: float
    date: date
    time: time
    status: str
    master: Optional[MasterOut] = None

    class Config:
        from_attributes = True


class AppointmentUpdate(BaseModel):
    date: date
    time: time


# ---------- Clients (для кабинета мастера) ----------
class ClientAppointment(BaseModel):
    service: str
    amount: float
    date: str
    time: str


class ClientOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    image: str
    appointments: list[ClientAppointment] = []


# ---------- Admin ----------
class AdminMessageIn(BaseModel):
    master_id: int
    subject: str = ""
    body: str


class AdminRegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str = ""
    last_name: str = ""
    phone: str = ""