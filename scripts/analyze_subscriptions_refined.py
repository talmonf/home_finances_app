#!/usr/bin/env python3
"""Refined RiseUp subscription extraction for review."""
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

MERGE_ALIASES = {
    "CLAUDE AI": ["CLAUDE.AI", "ANTHROPIC", "CLAUDE SUB"],
    "CURSOR": ["CURSOR AI", "CURSOR AI POWERED"],
    "GOOGLE YOUTUBE PREMIUM": ["YOUTUBEPREMIUM", "YOUTUBE PREMIUM", "GOOGLE YOUTUBEPREMIUM"],
    "GOOGLE ONE": ["GOOGLE ONE"],
    "GOOGLE LEAP FITNESS": ["GOOGLE LEAP FITNESS", "LEAP FITNESS"],
    "GOOGLE FASTING": ["GOOGLE FASTING", "FASTING INTERM"],
    "ZOOM": ["ZOOM.US", "ZOOM.COM", "ZOOMCOMM", "PAYPAL *ZOOM"],
    "OPENAI": ["OPENAI", "CHATGPT"],
    "BEZEQ": ["בזק", "B בזק"],
    "PARTNER MOBILE": ["פרטנר"],
    "RISEUP APP": ["RISEUP", "RISE UP", "RISEUP.CO"],
    "TRIBALPAGES": ["TRIBALPAGES"],
    "NETFLIX": ["NETFLIX"],
    "SPOTIFY": ["SPOTIFY"],
    "APPLE ICLOUD": ["APPLE.COM/BILL", "ICLOUD"],
    "MICROSOFT": ["MICROSOFT", "MSFT"],
    "ADOBE": ["ADOBE"],
    "GITHUB": ["GITHUB"],
    "DROPBOX": ["DROPBOX"],
    "NOTION": ["NOTION"],
    "AMAZON PRIME": ["AMAZON PRIME", "AMZN PRIME"],
    "DISNEY+": ["DISNEY", "DISNEYPLUS"],
    "CANVA": ["CANVA"],
    "WIX": ["WIX"],
    "LINKEDIN": ["LINKEDIN"],
}

SUB_CATS = {"דיגיטל", "מנויים", "תקשורת"}
EXCLUDE_CATS = [
    "סופר", "תרומה", "ביטוח", "בריאות", "ארנונה", "מים", "חינוך", "ילדים",
    "עמלות", "הלוואה", "ביטוח לאומי", "הכנסות", "תשלומים", "ים סוף",
    "הוצאות לא תזרימיות",
]
EXCLUDE_MERCHANT = [
    r"תרומ", r'גמ["\']?ח', r'קופ["\']?ח', r"מגדל", r"מנורה", r"כלל חברה", r"עיריית",
    r"מי ה", r"חשמל", r"מאיר פנים", r"רפאנו", r"תקוה", r"להושיט", r"צביה", r"קרית",
    r"מפעל הפיס", r"העברה", r"פזגז", r"בן דוד", r"רואי חשב", r"PAYBOX", r"דמי כרטיס",
    r"הסתדרות", r"ILS USD", r"מינימרקט", r"שופרסל", r"רמי לוי", r"מרקט", r"סטוקי",
    r"ממתק", r"מ ש ג ב", r"^מ ש ג",
]


def parse_date(s: str):
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y")
    except ValueError:
        return None


def parse_amt(row: dict):
    for key in ("סכום", "סכום מקורי"):
        s = row.get(key, "")
        if not s:
            continue
        try:
            v = float(str(s).replace(",", ""))
            if v < 0:
                return abs(v)
        except ValueError:
            pass
    return None


def is_installment(row: dict) -> bool:
    pn = (row.get("מספר התשלום") or "").strip()
    pt = (row.get("מספר תשלומים כולל") or "").strip()
    if pn and pt:
        try:
            return int(pt) > 1 and int(pn) <= int(pt)
        except ValueError:
            pass
    return False


def canonical_name(biz: str) -> str:
    upper = biz.upper().strip()
    for canon, patterns in MERGE_ALIASES.items():
        for pattern in patterns:
            if pattern.upper() in upper:
                return canon
    if "בזק" in biz and "הוראת" in biz:
        return "BEZEQ STANDING ORDER"
    return upper[:60]


def pm_label(method: str, identifier: str) -> str:
    mapping = {
        "cal": "credit card",
        "isracard": "credit card",
        "leumicard": "credit card",
        "yahavbank": "bank account",
        "mizrahi": "bank account",
    }
    base = mapping.get(method.lower(), method)
    return f"{base} ending {identifier}" if identifier else base


def is_subscription_candidate(canon: str, txns: list) -> tuple[bool, str]:
    cat = txns[0]["cat"]
    biz = txns[0]["biz"]
    if any(x in cat for x in EXCLUDE_CATS):
        return False, "excluded category"
    if any(re.search(p, biz, re.I) for p in EXCLUDE_MERCHANT):
        return False, "excluded merchant"
    if any(re.search(p, canon, re.I) for p in EXCLUDE_MERCHANT):
        return False, "excluded canonical"

    if cat in SUB_CATS:
        return True, f"RiseUp category '{cat}'"
    if canon in MERGE_ALIASES:
        return True, "known subscription service (name merge group)"
    if "הוראת קבע" in biz and ("בזק" in biz or "פרטנר" in biz):
        return True, "telecom standing order (הוראת קבע)"
    if "דמי חבר" in biz:
        return True, "membership fee (דמי חבר)"
    if "מנוי" in biz.lower() or "subscription" in biz.lower():
        return True, "'subscription' or 'מנוי' in merchant name"

    dated = [t for t in txns if t["date"]]
    if len(dated) < 3:
        return False, "too few payments"
    dated.sort(key=lambda x: x["date"])
    amounts = [t["amt"] for t in dated]
    avg = sum(amounts) / len(amounts)
    variance = (max(amounts) - min(amounts)) / avg if avg else 99
    intervals = [
        (dated[i]["date"] - dated[i - 1]["date"]).days for i in range(1, len(dated))
    ]
    avg_interval = sum(intervals) / len(intervals)
    if variance <= 0.12 and 25 <= avg_interval <= 35 and cat in ("כללי", "תקשורת", "דיגיטל", "מנויים"):
        return True, f"monthly recurring ({len(dated)} payments, stable amount)"
    return False, "no subscription signal"


def analyze(path: Path) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if is_installment(row):
                continue
            amt = parse_amt(row)
            if amt is None:
                continue
            rows.append(
                {
                    "biz": (row.get("שם העסק") or "").strip(),
                    "amt": amt,
                    "date": parse_date(row.get("תאריך התשלום") or ""),
                    "cat": (row.get("קטגוריה בתזרים") or "").strip(),
                    "method": (row.get("אמצעי התשלום") or "").strip(),
                    "id": (row.get("אמצעי זיהוי התשלום") or "").strip(),
                    "notes": (row.get("הערות") or "").strip(),
                }
            )

    groups: dict[str, list] = defaultdict(list)
    for row in rows:
        groups[canonical_name(row["biz"])].append(row)

    subscriptions = []
    for canon, txns in groups.items():
        clusters: list[list] = []
        for txn in sorted(txns, key=lambda x: x["amt"]):
            placed = False
            for cluster in clusters:
                avg = sum(x["amt"] for x in cluster) / len(cluster)
                if abs(txn["amt"] - avg) / avg <= 0.12:
                    cluster.append(txn)
                    placed = True
                    break
            if not placed:
                clusters.append([txn])

        for cluster in clusters:
            ok, reason = is_subscription_candidate(canon, cluster)
            if not ok:
                continue
            dated = sorted([t for t in cluster if t["date"]], key=lambda x: x["date"])
            if not dated:
                continue
            if len(dated) < 2 and canon not in MERGE_ALIASES and "דמי חבר" not in dated[0]["biz"]:
                continue

            amounts = [t["amt"] for t in dated]
            avg = sum(amounts) / len(amounts)
            intervals = [
                (dated[i]["date"] - dated[i - 1]["date"]).days
                for i in range(1, len(dated))
            ]
            avg_interval = sum(intervals) / len(intervals) if intervals else 0
            if intervals and 350 <= avg_interval <= 380:
                frequency = "yearly"
            elif intervals and avg_interval > 200:
                frequency = "yearly"
            else:
                frequency = "monthly"

            inst_counts: dict[tuple, int] = defaultdict(int)
            for t in dated:
                inst_counts[(t["method"], t["id"])] += 1
            top_inst = max(inst_counts, key=inst_counts.get)

            alt_names = sorted(set(t["biz"] for t in dated))
            display = canon if canon in MERGE_ALIASES else dated[0]["biz"]
            yearly_total = round(avg * 12, 2) if frequency == "monthly" else round(avg, 2)
            avg_monthly = round(avg if frequency == "monthly" else avg / 12, 2)

            subscriptions.append(
                {
                    "name": display,
                    "merged_from": alt_names if len(alt_names) > 1 else [],
                    "frequency": frequency,
                    "avg_monthly_ils": avg_monthly,
                    "yearly_total_ils": yearly_total,
                    "per_payment_ils": round(avg, 2),
                    "start": dated[0]["date"].strftime("%d/%m/%Y"),
                    "end": dated[-1]["date"].strftime("%d/%m/%Y"),
                    "payments": len(dated),
                    "payment_method": pm_label(*top_inst),
                    "category": dated[0]["cat"],
                    "reason": reason,
                }
            )

    subscriptions.sort(key=lambda x: (-x["yearly_total_ils"], x["name"]))
    return subscriptions


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        r"c:\Users\Owner\My Drive\Personal\Finances\2026-06-26 - RiseUp Export.csv"
    )
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("subscription_analysis_refined.json")
    results = analyze(src)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Found {len(results)} subscriptions -> {dst}")
    for s in results:
        merge = ""
        if s["merged_from"]:
            merge = " [merged: " + ", ".join(s["merged_from"][:3]) + "]"
        print(
            f"{s['frequency']:7} | {s['avg_monthly_ils']:8.2f}/mo | "
            f"{s['yearly_total_ils']:9.2f}/yr | x{s['payments']:2} | "
            f"{s['name'][:45]}{merge}"
        )
