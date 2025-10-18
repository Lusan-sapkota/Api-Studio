from sqlmodel import Session
from core.security import get_password_hash
from core.config import settings
from db.models import User, Workspace


def seed_database(session: Session):
    # Create admin user if credentials provided
    if settings.admin_username and settings.admin_password:
        admin_user = session.get(User, 1)
        if not admin_user:
            hashed_password = get_password_hash(settings.admin_password)
            admin_user = User(
                username=settings.admin_username,
                email=f"{settings.admin_username}@example.com",
                hashed_password=hashed_password,
                is_admin=True
            )
            session.add(admin_user)
            session.commit()
            session.refresh(admin_user)

            # Create default workspace
            default_workspace = Workspace(
                name="Default Workspace",
                description="Default workspace for API testing",
                owner_id=admin_user.id
            )
            session.add(default_workspace)
            session.commit()

    # Add more seeding logic here as needed