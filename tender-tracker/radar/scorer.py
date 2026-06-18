from datetime import date

# Actual PRAZ eGP category codes relevant to Facer's services
# (These are PRAZ's internal codes — different from ZIFA's C4/C7/C8/J2/J3 classification)
TARGET_CODES = {
    "SP006",  # Printing Services
    "GP003",  # Printing Spares, Sundries
    "ST003",  # Textbook and Booklet Publishing
    "SS001",  # Signage and Branding Services
    "SM002",  # Marketing and Advertising Services / Signage
    "SM004",  # Media Production (filming, photography)
    "SE003",  # Event Management, Exhibition, Stand Building
    "ST002",  # Website dev, domain registration, hosting
    "GC008",  # Corporate Gifts
    "GS006",  # Stationery Products and Paper Raw Materials
    "GC009",  # Corporate Wear
    "GU005",  # Uniform and Textile Materials
    "ST001",  # Tailoring Services, Uniform Materials
    "GO001",  # Ordinance/branded items (badges, lanyards, embroidered items)
}

# Keywords matched against title + description when no exact code match
_KEYWORDS = [
    "graphic design", "design", "branding", "brand identity",
    "print", "printing", "publication", "digital marketing",
    "website", "web development", "web design",
    "stationery", "corporate gift", "promotional gift",
    "corporate wear", "uniform", "t-shirt", "polo shirt",
    "signage", "banner", "large format", "marketing material",
    "logo", "company profile", "annual report",
]

# Past clients / known relationships — bonus score
_PAST_CLIENTS = [
    "zifa", "zimbabwe football",
    "save the children",
    "edriem",
    "cicada", "makandi",
]


def score(tender: dict) -> int:
    pts = 0

    # ── 1. Category match (up to 45 pts) ─────────────────────────────────────
    # PRAZ cells can have multiple codes: "GC008 ,GC009"
    codes = {c.strip().upper() for c in (tender.get("category") or "").split(",")}
    if codes & TARGET_CODES:
        pts += 45
    else:
        # Fall back to keyword matching on title + description
        text = f"{tender.get('title', '')} {tender.get('description', '')}".lower()
        hits = sum(1 for kw in _KEYWORDS if kw in text)
        pts += min(hits * 8, 40)

    # ── 2. Deadline runway (up to 25 pts) ────────────────────────────────────
    dl = tender.get("deadline")
    if dl:
        try:
            days = (date.fromisoformat(str(dl)[:10]) - date.today()).days
            if days < 0:
                pts += 0      # already closed
            elif days < 5:
                pts += 5      # almost gone — penalise
            elif days <= 14:
                pts += 25     # sweet spot
            elif days <= 30:
                pts += 20
            elif days <= 60:
                pts += 15
            else:
                pts += 10
        except ValueError:
            pass

    # ── 3. Entity relationship bonus (up to 20 pts) ──────────────────────────
    entity = (tender.get("entity") or "").lower()
    if any(c in entity for c in _PAST_CLIENTS):
        pts += 20

    # ── 4. Source trust (up to 10 pts) ───────────────────────────────────────
    src = (tender.get("source") or "").upper()
    if src == "PRAZ":
        pts += 10
    elif src == "UNGM":
        pts += 8

    return min(pts, 100)
