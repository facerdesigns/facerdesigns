"""
PRAZ eGP bulletin board scraper.
Server-rendered HTML — uses requests + BeautifulSoup only, no headless browser needed.
Public URL: https://egp.praz.org.zw/Indexes/index
"""
import re
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

_BASE    = "https://egp.praz.org.zw"
_LIST    = f"{_BASE}/Indexes/index"
_DETAIL  = f"{_BASE}/Indexes/viewLiveTenderDetails"

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FacerRadar/1.0; tender monitoring)",
    "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

_DATE_FMTS = ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d %B %Y")


def _parse_date(raw: str) -> str | None:
    # Dates come with an optional time component: "19-Jun-2026 10:00 AM"
    s = raw.strip().split(" ")[0]
    for fmt in _DATE_FMTS:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _total_pages(session: requests.Session) -> int:
    resp = session.get(_LIST, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    # Page text looks like "Page 1 of 57, showing…"
    match = re.search(r"Page \d+ of (\d+)", soup.get_text())
    return int(match.group(1)) if match else 1


def _scrape_page(page: int, session: requests.Session) -> list[dict]:
    params = {
        "url":       "Indexes/index",
        "page":      page,
        "direction": "BulletinBoardLive.id",
    }
    resp = session.get(_LIST, params=params, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    now = datetime.now(timezone.utc).isoformat()

    # No <tbody> — rows are direct children of <table>; skip the header row
    for row in soup.select("table tr"):
        cells = row.find_all("td")
        if len(cells) < 9:
            continue

        # Column order: ID | Ref No | Title | Cat Code | Cat Name | Entity | Scope | Publish | Closing
        id_tag  = cells[0].find("a")
        raw_id  = id_tag.text.strip() if id_tag else cells[0].text.strip()
        ref     = cells[1].text.strip()
        title   = cells[2].text.strip()
        cat_code = cells[3].text.strip()
        cat_name = cells[4].text.strip()
        entity   = cells[5].text.strip()
        deadline = _parse_date(cells[8].text.strip())

        if not raw_id or not title:
            continue

        results.append({
            "tender_id":  f"PRAZ-{raw_id}",
            "source":     "PRAZ",
            "title":      title,
            "entity":     entity,
            "category":   cat_code,
            "deadline":   deadline,
            "description": f"{cat_name} | Ref: {ref}",
            "source_url": id_tag["href"] if id_tag and id_tag.get("href") else f"{_DETAIL}/{raw_id}",
            "scraped_at": now,
            "score":      0,
        })

    return results


def scrape(max_pages: int | None = None, delay: float = 1.5) -> list[dict]:
    session = requests.Session()
    total   = _total_pages(session)
    pages   = min(total, max_pages) if max_pages else total
    all_t   = []

    print(f"[PRAZ] {total} total pages, scraping {pages}")

    for page in range(1, pages + 1):
        try:
            batch = _scrape_page(page, session)
            all_t.extend(batch)
            print(f"[PRAZ] page {page}/{pages} — {len(batch)} tenders found")
            if page < pages:
                time.sleep(delay)
        except Exception as exc:
            print(f"[PRAZ] page {page} error: {exc}")

    return all_t
