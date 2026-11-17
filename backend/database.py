import os
import json
import logging
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://antigravity@127.0.0.1:5432/b2b_intelligence"
)

# Render/Heroku compatibility: convert postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connection_pool = None


def get_pool():
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=15,
            dsn=DATABASE_URL
        )
    return _connection_pool


@contextmanager
def get_db_connection():
    p = get_pool()
    conn = p.getconn()
    try:
        yield conn
    finally:
        p.putconn(conn)


@contextmanager
def get_db_cursor(commit=False):
    with get_db_connection() as conn:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def init_db():
    """Create tables and indexes if they do not exist."""
    schema_sql = """
    CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        trade_name TEXT,
        registration_number TEXT NOT NULL,
        street TEXT,
        postal_code TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        sic_code TEXT,
        industry_description TEXT,
        revenue_usd NUMERIC(20, 2),
        revenue_local NUMERIC(20, 2),
        employees_total INTEGER,
        employees_onsite INTEGER,
        hq_local TEXT,
        hq_national TEXT,
        hq_global TEXT,
        founding_year INTEGER,
        import_export_codes TEXT,
        source_file TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_registration_number ON companies (registration_number);
    CREATE INDEX IF NOT EXISTS idx_companies_country ON companies (country);
    CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);
    CREATE INDEX IF NOT EXISTS idx_companies_sic_code ON companies (sic_code);
    CREATE INDEX IF NOT EXISTS idx_companies_employees_total ON companies (employees_total);
    CREATE INDEX IF NOT EXISTS idx_companies_revenue_usd ON companies (revenue_usd);
    CREATE INDEX IF NOT EXISTS idx_companies_company_name_lower ON companies (LOWER(company_name));

    CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        job_title TEXT,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        company_registration_number TEXT,
        company_name TEXT,
        email TEXT,
        linkedin_url TEXT,
        source TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_job_title ON contacts (job_title);
    CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts (company_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_company_reg ON contacts (company_registration_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_person ON contacts (full_name, COALESCE(company_registration_number, ''), COALESCE(job_title, ''));
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(schema_sql)
    logger.info("PostgreSQL schema initialized successfully.")
