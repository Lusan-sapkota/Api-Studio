from sqlmodel import SQLModel, create_engine, Session
from core.config import settings

# For SQLite, use sync engine for simplicity
engine = create_engine(settings.database_url, echo=True)

# Session factory using SQLModel Session
def SessionLocal():
    return Session(engine)


def get_session():
    with SessionLocal() as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(bind=engine)


def migrate_database():
    """Run database migrations for authentication system."""
    from db.migrate import run_migration
    run_migration()