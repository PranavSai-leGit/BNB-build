import sys
import json
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, make_transient

import os
from app.config import settings

# Supabase database URL read securely from environment or settings
supabase_db_url = settings.get_database_url()

# Optional local source URL for migrations
local_db_url = os.getenv("LOCAL_DATABASE_URL", "postgresql+psycopg2://postgres:postgrespassword@localhost:5432/cognilab")

local_engine = create_engine(local_db_url)
supabase_engine = create_engine(supabase_db_url, pool_pre_ping=True)

LocalSession = sessionmaker(bind=local_engine)
SupabaseSession = sessionmaker(bind=supabase_engine)

from app.database import Base
from app.models import (
    User,
    Organization,
    OrganizationMember,
    Experiment,
    ExperimentVersion,
    Stimulus,
    ParticipantSession,
    ConsentRecord,
    TrialResult,
    AuditLog
)

MODELS = [
    Organization,
    User,
    OrganizationMember,
    Experiment,
    ExperimentVersion,
    Stimulus,
    ParticipantSession,
    ConsentRecord,
    TrialResult,
    AuditLog
]

def run_migration():
    print("1. Creating / verifying all tables in Supabase schema...")
    Base.metadata.create_all(bind=supabase_engine)
    print("[OK] Schema created.")

    # Truncate tables in Supabase in reverse order
    with supabase_engine.begin() as conn:
        for model in reversed(MODELS):
            table_name = model.__tablename__
            conn.execute(text(f"TRUNCATE TABLE {table_name} CASCADE;"))
    print("[OK] Supabase tables cleared for clean transfer.")

    local_db = LocalSession()
    supa_db = SupabaseSession()

    try:
        for model in MODELS:
            table_name = model.__tablename__
            items = local_db.query(model).all()
            print(f"\nTransferring '{table_name}' ({len(items)} records)...")
            
            for item in items:
                # Expunge from local session and make transient to attach to Supabase session
                local_db.expunge(item)
                make_transient(item)
                supa_db.add(item)
            
            supa_db.commit()
            supa_count = supa_db.query(model).count()
            print(f"  [OK] {supa_count}/{len(items)} transferred into Supabase '{table_name}'")

        print("\n==================================================")
        print("ALL DATA AND SCHEMA TRANSFERRED TO SUPABASE SUCCESSFULLY!")
        print("==================================================")
    except Exception as e:
        supa_db.rollback()
        print(f"Error during migration: {e}")
        raise e
    finally:
        local_db.close()
        supa_db.close()

if __name__ == "__main__":
    run_migration()
