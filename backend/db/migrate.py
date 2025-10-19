"""
Database migration script for authentication system enhancements.
This script handles the migration from the basic user model to the enhanced authentication model.
"""

from sqlalchemy import text, inspect
from sqlmodel import SQLModel
from core.database import engine, SessionLocal
from db.models import User, OTPCode, Invitation, AuditLog
import logging

logger = logging.getLogger(__name__)


def check_column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate_user_table():
    """Migrate the User table to add new authentication fields."""
    with SessionLocal() as session:
        try:
            # Check if User table exists
            if not check_table_exists('user'):
                logger.info("User table doesn't exist, will be created by create_all()")
                return
            
            # Add new columns if they don't exist
            new_columns = [
                ("name", "VARCHAR"),
                ("role", "VARCHAR DEFAULT 'viewer'"),
                ("two_factor_enabled", "BOOLEAN DEFAULT FALSE"),
                ("two_factor_secret", "VARCHAR"),
                ("backup_codes", "VARCHAR"),
                ("requires_password_change", "BOOLEAN DEFAULT FALSE"),
                ("last_login_at", "DATETIME"),
                ("failed_login_attempts", "INTEGER DEFAULT 0"),
                ("locked_until", "DATETIME"),
                ("status", "VARCHAR DEFAULT 'active'")
            ]
            
            migration_needed = False
            for column_name, column_def in new_columns:
                if not check_column_exists('user', column_name):
                    try:
                        session.execute(text(f"ALTER TABLE user ADD COLUMN {column_name} {column_def}"))
                        logger.info(f"Added column {column_name} to user table")
                        migration_needed = True
                    except Exception as e:
                        logger.warning(f"Failed to add column {column_name}: {e}")
            
            # Update existing users to have proper roles and status
            if migration_needed:
                # Set default values for existing users
                session.execute(text("UPDATE user SET role = 'admin' WHERE role IS NULL AND (is_admin = TRUE OR is_admin = 1)"))
                session.execute(text("UPDATE user SET role = 'viewer' WHERE role IS NULL"))
                session.execute(text("UPDATE user SET status = 'active' WHERE status IS NULL"))
                session.execute(text("UPDATE user SET two_factor_enabled = FALSE WHERE two_factor_enabled IS NULL"))
                session.execute(text("UPDATE user SET requires_password_change = FALSE WHERE requires_password_change IS NULL"))
                session.execute(text("UPDATE user SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL"))
                logger.info("Updated existing users with default authentication values")
            
            session.commit()
            logger.info("User table migration completed successfully")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error migrating user table: {e}")
            raise


def create_new_tables():
    """Create new authentication tables."""
    try:
        # Create all tables (this will only create missing ones)
        SQLModel.metadata.create_all(bind=engine)
        logger.info("Created new authentication tables")
    except Exception as e:
        logger.error(f"Error creating new tables: {e}")
        raise


def run_migration():
    """Run the complete migration process."""
    logger.info("Starting database migration for authentication system")
    
    try:
        # Step 1: Migrate existing User table
        migrate_user_table()
        
        # Step 2: Create new authentication tables
        create_new_tables()
        
        logger.info("Database migration completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


def run_migration_safe():
    """
    Run migration with error handling suitable for application startup.
    Returns True if successful, False if failed.
    """
    try:
        run_migration()
        return True
    except Exception as e:
        logger.error(f"Migration failed during startup: {e}")
        return False


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run migration
    run_migration()