from sqlmodel import SQLModel, create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

# For SQLite, use sync engine for simplicity
engine = create_engine(settings.database_url, echo=True)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session():
    with SessionLocal() as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(bind=engine)