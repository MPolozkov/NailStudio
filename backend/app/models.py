from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Date, Time, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, default="")
    last_name = Column(String, default="")
    phone = Column(String, default="")
    phone_confirmed = Column(String, default="")
    city = Column(String, default="")
    bio = Column(Text, default="")
    image = Column(Text, default="")  # base64 data URL
    role = Column(String, default="User")  # User | Staff | Admin
    created_at = Column(DateTime, default=datetime.utcnow)

    master = relationship("Master", back_populates="user", uselist=False)
    appointments = relationship("Appointment", back_populates="user")


class Master(Base):
    __tablename__ = "masters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, default="")
    specialty = Column(String, default="")
    experience = Column(String, default="")
    about = Column(Text, default="")
    image = Column(Text, default="")
    phone = Column(String, default="")
    telegram_chat_id = Column(String, default="")  # чат мастера с ботом для уведомлений
    status = Column(String, default="pending")  # pending | active
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="master")
    services = relationship("Service", back_populates="master", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="master")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    price = Column(Float, default=0)
    duration_minutes = Column(Integer, default=60)
    description = Column(Text, default="")
    image = Column(Text, default="")

    master = relationship("Master", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True)
    service_title = Column(String, default="")
    amount = Column(Float, default=0)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String, default="confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="appointments")
    master = relationship("Master", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")