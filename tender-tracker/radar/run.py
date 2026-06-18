#!/usr/bin/env python3
"""
Facer Tender Radar — CLI runner

Commands:
  python run.py scrape [--pages N] [--source praz|ungm|all]
      Scrape sources, score, store to SQLite.
      --pages N  : limit to N pages per source (useful for testing)
      --source   : which source(s) to scrape (default: all)

  python run.py sync [--min-score N]
      Push tenders with score >= N (default 30) to Firestore radar_tenders.
      Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a
      Firebase service account JSON, or place serviceAccount.json in radar/.

      Firestore security rules must allow anonymous-auth reads on radar_tenders:
        match /radar_tenders/{id} {
          allow read: if request.auth != null;
          allow write: if false;
        }

  python run.py list [--min-score N]
      Print scored tenders from local SQLite to stdout.
"""

import argparse
import os
import sys

from storage import init_db, upsert, get_all, count
from scorer  import score as calc_score

# ── helpers ───────────────────────────────────────────────────────────────────

def _run_scraper(name: str, scrape_fn, max_pages, conn):
    print(f"\n=== {name} ===")
    try:
        tenders = scrape_fn(max_pages=max_pages)
    except Exception as exc:
        print(f"[{name}] scrape failed: {exc}")
        return 0

    for t in tenders:
        t["score"] = calc_score(t)
        upsert(conn, t)

    high = sum(1 for t in tenders if t["score"] >= 70)
    print(f"[{name}] stored {len(tenders)} tenders — {high} scored 70+")
    return len(tenders)

# ── commands ──────────────────────────────────────────────────────────────────

def cmd_scrape(args):
    from scraper_praz import scrape as praz_scrape
    conn = init_db()
    src  = (args.source or "all").lower()

    if src in ("praz", "all"):
        _run_scraper("PRAZ eGP", praz_scrape, args.pages, conn)

    if src in ("ungm", "all"):
        try:
            from scraper_ungm import scrape as ungm_scrape
            _run_scraper("UNGM", ungm_scrape, args.pages, conn)
        except ImportError:
            print("\n[UNGM] playwright not installed — skipping. Run: pip install playwright && playwright install chromium")

    total = count(conn)
    conn.close()
    print(f"\nDone. Local DB contains {total} tenders total.")


def cmd_sync(args):
    min_score = args.min_score if hasattr(args, "min_score") else 30
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as admin_fs
    except ImportError:
        print("firebase-admin not installed. Run: pip install firebase-admin")
        sys.exit(1)

    if not firebase_admin._apps:
        # Railway: service account JSON stored as env var
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            import json
            firebase_admin.initialize_app(credentials.Certificate(json.loads(sa_json)))
        else:
            # Local: file path
            sa_path = (
                os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
                or os.path.join(os.path.dirname(__file__), "serviceAccount.json")
            )
            if not os.path.exists(sa_path):
                print(f"No credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON env var (Railway) "
                      f"or place serviceAccount.json in radar/")
                sys.exit(1)
            firebase_admin.initialize_app(credentials.Certificate(sa_path))

    db   = admin_fs.client()
    conn = init_db()
    rows = get_all(conn, min_score=min_score)
    conn.close()

    print(f"Syncing {len(rows)} tenders (score >= {min_score}) to Firestore…")

    batch = db.batch()
    n     = 0
    for t in rows:
        ref = db.collection("radar_tenders").document(t["tender_id"])
        batch.set(ref, t, merge=True)
        n += 1
        if n % 499 == 0:        # Firestore batch limit is 500 ops
            batch.commit()
            batch = db.batch()
            print(f"  {n} pushed…")

    batch.commit()
    print(f"Done. {n} tenders synced to Firestore radar_tenders.")


def cmd_list(args):
    min_score = args.min_score if hasattr(args, "min_score") else 0
    conn = init_db()
    rows = get_all(conn, min_score=min_score)
    conn.close()

    if not rows:
        print("No tenders in local DB yet. Run: python run.py scrape")
        return

    print(f"{'Score':>5}  {'Category':<6}  {'Deadline':<12}  {'Entity':<35}  Title")
    print("-" * 100)
    for t in rows[:100]:
        entity = (t.get("entity") or "")[:34]
        title  = (t.get("title")  or "")[:50]
        print(f"{t['score']:>5}  {t.get('category',''):<6}  {t.get('deadline') or 'N/A':<12}  {entity:<35}  {title}")

    if len(rows) > 100:
        print(f"\n… and {len(rows) - 100} more. Adjust --min-score to narrow results.")

# ── main ─────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Facer Tender Radar", formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    sub = p.add_subparsers(dest="cmd")

    sp = sub.add_parser("scrape", help="Scrape sources and store to local DB")
    sp.add_argument("--pages",  type=int, default=None, metavar="N", help="Limit pages per source (dev mode)")
    sp.add_argument("--source", default="all", choices=["praz", "ungm", "all"], help="Which source to scrape")

    sy = sub.add_parser("sync", help="Push tenders from local DB to Firestore")
    sy.add_argument("--min-score", type=int, default=30, metavar="N", help="Only sync tenders with score >= N (default 30)")

    ls = sub.add_parser("list", help="Print tenders from local DB")
    ls.add_argument("--min-score", type=int, default=0, metavar="N")

    args = p.parse_args()
    if   args.cmd == "scrape": cmd_scrape(args)
    elif args.cmd == "sync":   cmd_sync(args)
    elif args.cmd == "list":   cmd_list(args)
    else:
        p.print_help()

if __name__ == "__main__":
    main()
