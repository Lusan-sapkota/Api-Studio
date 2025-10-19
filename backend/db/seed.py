from sqlalchemy.orm import Session
from sqlmodel import select
from core.password_service import password_service
from core.config import settings
from db.models import User, Workspace
import logging

logger = logging.getLogger(__name__)


def seed_database(session: Session):
    """
    Seed database with initial data based on mode and configuration.
    In hosted mode: Only creates data if system is not locked (admin exists)
    In local mode: Creates admin user if credentials provided
    """
    
    # Check if any admin users exist
    admin_query = select(User).where(User.role == "admin")
    admin_result = session.execute(admin_query)
    admin_exists = admin_result.scalars().first() is not None
    
    if settings.app_mode == "local":
        # Local mode: Create admin user if credentials provided and no admin exists
        if settings.admin_username and settings.admin_password and not admin_exists:
            logger.info("Creating admin user for local mode")
            
            hashed_password = password_service.hash_password(settings.admin_password)
            admin_user = User(
                username=settings.admin_username,
                email=f"{settings.admin_username}@example.com",
                hashed_password=hashed_password,
                name="Local Admin User",
                role="admin",
                status="active",
                two_factor_enabled=False,  # 2FA not required in local mode
                requires_password_change=False
            )
            session.add(admin_user)
            session.commit()
            session.refresh(admin_user)
            
            logger.info(f"Created admin user: {admin_user.username}")

            # Create default workspace for admin
            create_default_workspace(session, admin_user)
            
        elif not settings.admin_username or not settings.admin_password:
            logger.info("No admin credentials provided for local mode - skipping admin user creation")
            
    elif settings.app_mode == "hosted":
        # Hosted mode: Only seed if admin exists (system not locked)
        if admin_exists:
            logger.info("Admin user exists - system is unlocked")
            # Could add additional seeding logic here for hosted mode
        else:
            logger.info("No admin user exists - system is locked, awaiting bootstrap")
    
    # Add any additional seeding logic here
    seed_development_data(session)


def create_default_workspace(session: Session, user: User):
    """Create a default workspace for a user."""
    try:
        # Check if user already has workspaces
        workspace_query = select(Workspace).where(Workspace.owner_id == user.id)
        workspace_result = session.execute(workspace_query)
        existing_workspace = workspace_result.scalars().first()
        
        if not existing_workspace:
            default_workspace = Workspace(
                name="Default Workspace",
                description="Default workspace for API testing and development",
                owner_id=user.id
            )
            session.add(default_workspace)
            session.commit()
            logger.info(f"Created default workspace for user: {user.username}")
            
    except Exception as e:
        logger.error(f"Failed to create default workspace: {e}")
        session.rollback()


def seed_development_data(session: Session):
    """
    Seed additional development data if in development environment.
    This can include sample collections, environments, etc.
    """
    
    # Only seed development data in local mode or if explicitly enabled
    if settings.app_mode == "local" and getattr(settings, 'seed_dev_data', False):
        logger.info("Seeding development data...")
        
        # Add development seeding logic here
        # For example: sample collections, environments, requests
        
        try:
            # Example: Create sample data
            pass
            
        except Exception as e:
            logger.error(f"Failed to seed development data: {e}")
            session.rollback()


def check_bootstrap_state(session: Session) -> dict:
    """
    Check the bootstrap state of the system.
    Returns information about system lock status and admin users.
    """
    
    # Count admin users
    admin_query = select(User).where(User.role == "admin")
    admin_result = session.execute(admin_query)
    admin_count = len(admin_result.scalars().all())
    
    # Count total users
    total_query = select(User)
    total_result = session.execute(total_query)
    total_users = len(total_result.scalars().all())
    
    is_locked = admin_count == 0
    
    return {
        "is_locked": is_locked,
        "admin_count": admin_count,
        "total_users": total_users,
        "mode": settings.app_mode,
        "bootstrap_available": bool(settings.admin_bootstrap_token) if settings.app_mode == "hosted" else False
    }