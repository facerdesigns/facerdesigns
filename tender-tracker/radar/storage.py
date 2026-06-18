import sqlite3
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "radar.db")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tenders (
    tender_id   TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    title       TEXT NOT NULL,
    entity      TEXT,
    category    TEXT,
    deadline    TEXT,
    description TEXT,
    source_url  TEXT,
    scraped_at  TEXT NOT NULL,
    score       INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'new'
);
"""

def init_db(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.execute(_SCHEMA)
    conn.commit()
    return conn

def upsert(conn, tender: dict):
    conn.execute("""
        INSERT INTO tenders
            (tender_id, source, title, entity, category, deadline,
             description, source_url, scraped_at, score, status)
        VALUES
            (:tender_id, :source, :title, :entity, :category, :deadline,
             :description, :source_url, :scraped_at, :score, 'new')
        ON CONFLICT(tender_id) DO UPDATE SET
            title       = excluded.title,
            entity      = excluded.entity,
            category    = excluded.category,
            deadline    = excluded.deadline,
            description = excluded.description,
            source_url  = excluded.source_url,
            scraped_at  = excluded.scraped_at,
            score       = excluded.score
    """, tender)
    conn.commit()

def get_all(conn, min_score: int = 0) -> list[dict]:
    cur = conn.execute(
        "SELECT * FROM tenders WHERE score >= ? ORDER BY score DESC, scraped_at DESC",
        (min_score,)
    )
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def count(conn) -> int:
    return conn.execute("SELECT COUNT(*) FROM tenders").fetchone()[0]
