"""
VDL — SQLite база данных через SQLAlchemy
Таблицы: downloads (история), saved_links (закладки)
"""
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# Абсолютный путь к базе: всегда корень проекта (на уровень выше папки database),
# независимо от того, из какой рабочей папки запущен Python.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, 'vdl.db')
print(f'[DB] База данных: {DB_PATH}')
engine = create_engine(f'sqlite:///{DB_PATH}', echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Download(Base):
    """История скачанных файлов"""
    __tablename__ = 'downloads'

    id          = Column(Integer, primary_key=True, index=True)
    url         = Column(String, nullable=False)
    title       = Column(String, nullable=False, default='')
    platform    = Column(String, default='')        # YouTube / VK / Dzen…
    thumbnail   = Column(Text, default='')          # URL превью
    quality     = Column(String, default='')        # 1080p / 720p / Аудио
    format      = Column(String, default='mp4')     # mp4 / mp3 / webm…
    file_path   = Column(String, default='')        # путь к файлу на диске
    file_size   = Column(Integer, default=0)        # байты
    duration    = Column(Integer, default=0)        # секунды
    status      = Column(String, default='done')    # done / error
    created_at  = Column(DateTime, default=datetime.utcnow)


class SavedLink(Base):
    """Закладки — ссылки для скачивания позже"""
    __tablename__ = 'saved_links'

    id          = Column(Integer, primary_key=True, index=True)
    url         = Column(String, nullable=False)
    title       = Column(String, default='')
    platform    = Column(String, default='')
    thumbnail   = Column(Text, default='')
    available_qualities = Column(String, default='')  # '1080p,720p,480p'
    created_at  = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
