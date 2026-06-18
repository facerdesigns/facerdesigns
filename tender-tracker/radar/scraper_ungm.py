"""
UNGM procurement notice scraper.
JS-rendered SPA — requires Playwright.
Install: pip install playwright && playwright install chromium

Public URL: https://www.ungm.org/Public/Notice
Filters used: Active opportunities only, beneficiary country = Zimbabwe (ZWE).
"""
import asyncio
import re
from datetime import datetime, timezone

_BASE = "https://www.ungm.org"
_URL  = f"{_BASE}/Public/Notice"

# UNGM country code for Zimbabwe — used in URL param or filter click
_ZWE_LABEL = "Zimbabwe"


def _parse_date(raw: str) -> str | None:
    s = raw.strip()
    for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


async def _scrape_async(max_pages: int | None = None) -> list[dict]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise RuntimeError("playwright not installed — run: pip install playwright && playwright install chromium")

    results = []
    now = datetime.now(timezone.utc).isoformat()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page    = await browser.new_page()

        await page.goto(_URL, wait_until="networkidle", timeout=30_000)

        # Check "Active opportunities" checkbox if present
        try:
            chk = page.locator("input[type='checkbox']").filter(has_text_near="Active")
            if await chk.count() == 0:
                # Try label-based search
                chk = page.get_by_label(re.compile("active", re.IGNORECASE))
            if not await chk.is_checked():
                await chk.click()
                await page.wait_for_timeout(1500)
        except Exception:
            pass

        # Apply Zimbabwe beneficiary country filter if the dropdown exists
        try:
            country_select = page.locator("select").filter(has_text="Select country")
            if await country_select.count() > 0:
                await country_select.select_option(label=_ZWE_LABEL)
                await page.wait_for_timeout(2000)
        except Exception:
            pass

        # Click Search / Apply if there's a button
        try:
            btn = page.get_by_role("button", name=re.compile("search|apply|filter", re.IGNORECASE))
            if await btn.count() > 0:
                await btn.first.click()
                await page.wait_for_timeout(3000)
        except Exception:
            pass

        page_num = 0
        while True:
            page_num += 1
            await page.wait_for_timeout(2000)

            # Extract rows — UNGM uses a table or repeating div structure
            rows = await page.query_selector_all("table tbody tr, .noticeRow, [class*='notice-row']")
            if not rows:
                # Try a more generic approach
                rows = await page.query_selector_all("tr[data-id], tr[data-notice-id]")

            for row in rows:
                try:
                    cells = await row.query_selector_all("td")
                    if len(cells) < 4:
                        continue

                    title_el = await row.query_selector("td:first-child a, .noticeTitle a, a[href*='/Public/Notice/']")
                    title    = (await title_el.inner_text()).strip() if title_el else (await cells[0].inner_text()).strip()

                    href = ""
                    if title_el:
                        href = await title_el.get_attribute("href") or ""
                        if href and not href.startswith("http"):
                            href = f"{_BASE}{href}"

                    # Try to extract other fields — column order varies
                    texts = [(await c.inner_text()).strip() for c in cells]
                    deadline = _parse_date(texts[1]) if len(texts) > 1 else None
                    org      = texts[3] if len(texts) > 3 else ""
                    ref      = texts[-1] if texts else ""

                    # Extract a stable ID from the URL or ref
                    notice_id = re.search(r"/Notice/(\d+)", href)
                    raw_id    = notice_id.group(1) if notice_id else re.sub(r"\W+", "-", ref)[:40]

                    if not raw_id or not title:
                        continue

                    results.append({
                        "tender_id":   f"UNGM-{raw_id}",
                        "source":      "UNGM",
                        "title":       title,
                        "entity":      org,
                        "category":    "",
                        "deadline":    deadline,
                        "description": "",
                        "source_url":  href or _URL,
                        "scraped_at":  now,
                        "score":       0,
                    })
                except Exception:
                    continue

            if max_pages and page_num >= max_pages:
                break

            # Paginate — look for Next button
            try:
                nxt = page.get_by_role("link", name=re.compile(r"next|›|»", re.IGNORECASE))
                if await nxt.count() == 0:
                    break
                await nxt.first.click()
                await page.wait_for_timeout(3000)
            except Exception:
                break

        await browser.close()

    return results


def scrape(max_pages: int | None = None) -> list[dict]:
    return asyncio.run(_scrape_async(max_pages=max_pages))
