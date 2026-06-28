#!/usr/bin/env python3
"""Analyze RiseUp export CSV for subscription patterns."""
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Subscription-like categories in RiseUp
SUBSCRIPTION_CATEGORIES = {"דיגיטל", "תקשורת", "כללי"}
# Exclude from subscriptions
EXCLUDE_CATEGORY_PATTERNS = [
    "סופר", "תרומה", "הוצאות לא תזרימיות", "הכנסות", "תשלומים",
    "ביטוח", "בריאות", "ארנונה", "מים", "חינוך", "ילדים", "ים סוף",
    "עמלות", "אחר", "הלוואה", "ביטוח לאומי",
]
# Known subscription merchant patterns (case-insensitive)
SUBSCRIPTION_KEYWORDS = [
    "premium", "netflix", "spotify", "youtube", "cursor", "google",
    "microsoft", "adobe", "icloud", "amazon prime", "disney", "openai",
    "chatgpt", "github", "dropbox", "zoom", "notion", "slack", "apple",
    "subscription", "claude", "fasting", "leap fitness", "tribalpages",
    "riseup", "paybox", "levi", "מנוי", "נטפליקס", "דמי חבר",
]
# Utilities/telecom that ARE subscriptions
TELECOM_SUBSCRIPTION = ["בזק", "פרטנר", "partner", "hot ", "סלקום", "cellcom", "golan"]
# Standing order in Hebrew
STANDING_ORDER = "הוראת קבע"
# Exclude merchants (donations, pensions, health funds, etc.)
EXCLUDE_MERCHANT_PATTERNS = [
    r"תרומ", r"גמ[\"']?ח", r"קופ[\"']?ח", r"מגדל", r"מנורה", r"כלל חברה",
    r"ביטוח", r"עיריית", r"מי ה", r"חשמל", r"ארנונה", r"ביטוח לאומי",
    r"הסתדרות", r"פנסיה", r"משכנ", r"הלווא", r"בנק הפועלים",
    r"מאיר פנים", r"רפאנו", r"תקוה ומרפ", r"להושיט", r"צביה",
    r"קרית הישיבה", r"מפעל הפיס", r"ILS USD",
]


def parse_date(s: str):
    if not s or not s.strip():
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            pass
    return None


def parse_amount(row: dict) -> float | None:
    for key in ("סכום", "סכום מקורי"):
        s = row.get(key, "")
        if not s or not str(s).strip():
            continue
        try:
            v = float(str(s).strip().replace(",", ""))
            if v < 0:
                return abs(v)
        except ValueError:
            pass
    return None


def normalize_for_merge(name: str) -> str:
    """Aggressive normalization for merging similar merchant names."""
    n = name.strip().upper()
    n = re.sub(r"\s+", " ", n)
    # Remove trailing transaction codes
    n = re.sub(r"\*[A-Z0-9]+$", "", n)
    n = re.sub(r"\s+\d+$", "", n)
    # Common variations
    n = n.replace("GOOGLE YOUTUBEPREMIUM", "GOOGLE YOUTUBE PREMIUM")
    n = n.replace("YOUTUBEPREMIUM", "YOUTUBE PREMIUM")
    n = re.sub(r"B\s+בזק", "בזק", n)
    n = re.sub(r"^B\s+", "", n)
    # Remove parenthetical suffixes
    n = re.sub(r"\([^)]*\)", "", n).strip()
    n = re.sub(r"\s+", " ", n)
    return n


def payment_method_label(method: str, identifier: str) -> str:
    method_map = {
        "cal": "credit card",
        "isracard": "credit card",
        "leumicard": "credit card",
        "yahavbank": "bank account",
        "mizrahi": "bank account",
    }
    base = method_map.get(method.lower(), method)
    if identifier:
        return f"{base} ending {identifier}"
    return base


def is_excluded_merchant(name: str, category: str) -> bool:
    for pat in EXCLUDE_CATEGORY_PATTERNS:
        if pat in category:
            return True
    for pat in EXCLUDE_MERCHANT_PATTERNS:
        if re.search(pat, name, re.IGNORECASE):
            return True
    return False


def detect_frequency(intervals: list[int], days_of_month: list[int], count: int) -> str:
    if not intervals:
        return "monthly" if count >= 2 else "unknown"
    avg = sum(intervals) / len(intervals)
    dom_var = max(days_of_month) - min(days_of_month) if days_of_month else 99
    if 350 <= avg <= 380:
        return "yearly"
    if 85 <= avg <= 95:
        return "quarterly"
    if 25 <= avg <= 35 or (dom_var <= 6 and count >= 3):
        return "monthly"
    if avg <= 20 and count >= 4:
        return "monthly"  # multiple charges per month (e.g. Bezeq lines)
    return "monthly" if count >= 3 and dom_var <= 10 else "unclear"


def subscription_reason(signals: list[str], biz: str, category: str, freq: str, count: int) -> str:
    parts = []
    if STANDING_ORDER in biz:
        parts.append("merchant name contains 'standing order' (הוראת קבע)")
    for kw in SUBSCRIPTION_KEYWORDS + TELECOM_SUBSCRIPTION:
        if kw.lower() in biz.lower():
            parts.append(f"known subscription/telecom keyword: '{kw}'")
            break
    if category in SUBSCRIPTION_CATEGORIES:
        parts.append(f"RiseUp category '{category}' (digital/telecom/general)")
    if "consistent_amount" in signals:
        parts.append(f"consistent amount across {count} payments")
    if "multiple_monthly_payments" in signals:
        parts.append(f"recurring ~monthly pattern ({count} payments)")
    if freq == "yearly":
        parts.append("payments occur approximately once per year")
    if not parts:
        parts.append(f"recurring payments detected ({count}x, {freq})")
    return "; ".join(parts)


def analyze_csv(path: Path) -> list[dict]:
    rows = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    groups: dict[tuple, list] = defaultdict(list)
    for r in rows:
        biz = (r.get("שם העסק") or "").strip()
        if not biz:
            continue
        amt = parse_amount(r)
        if amt is None:
            continue
        category = (r.get("קטגוריה בתזרים") or "").strip()
        if is_excluded_merchant(biz, category):
            continue
        pay_method = (r.get("אמצעי התשלום") or "").strip()
        pay_id = (r.get("אמצעי זיהוי התשלום") or "").strip()
        pay_date = parse_date(r.get("תאריך התשלום") or "")
        pay_num = (r.get("מספר התשלום") or "").strip()
        pay_total = (r.get("מספר תשלומים כולל") or "").strip()

        # Skip installment plans (not subscriptions)
        if pay_num and pay_total:
            try:
                if int(pay_total) > 1 and int(pay_num) <= int(pay_total):
                    continue
            except ValueError:
                pass

        merge_key = normalize_for_merge(biz)
        inst_key = (pay_method, pay_id)
        groups[(merge_key, inst_key)].append({
            "biz": biz,
            "amt": amt,
            "date": pay_date,
            "category": category,
            "pay_method": pay_method,
            "pay_id": pay_id,
            "notes": (r.get("הערות") or "").strip(),
        })

    # Merge across instruments for same normalized name (report primary instrument)
    by_name: dict[str, list] = defaultdict(list)
    for (merge_key, inst_key), txns in groups.items():
        by_name[merge_key].extend(txns)

    results = []
    for merge_key, all_txns in by_name.items():
        # Group by amount cluster (±15%) to split different plans
        amount_clusters: list[list] = []
        for t in sorted(all_txns, key=lambda x: x["amt"]):
            placed = False
            for cluster in amount_clusters:
                avg_c = sum(x["amt"] for x in cluster) / len(cluster)
                if abs(t["amt"] - avg_c) / avg_c <= 0.15:
                    cluster.append(t)
                    placed = True
                    break
            if not placed:
                amount_clusters.append([t])

        for txns in amount_clusters:
            dated = [t for t in txns if t["date"]]
            if len(dated) < 2:
                # Single payment - only if strong subscription signal
                t = txns[0]
                biz = t["biz"]
                strong = (
                    any(kw in biz.lower() for kw in SUBSCRIPTION_KEYWORDS)
                    or any(kw in biz.lower() for kw in TELECOM_SUBSCRIPTION)
                    or STANDING_ORDER in biz
                    or t["category"] == "דיגיטל"
                )
                if not strong:
                    continue
                dated = [t] if t["date"] else []

            if not dated:
                continue

            dated.sort(key=lambda x: x["date"])
            amounts = [t["amt"] for t in dated]
            avg_amt = sum(amounts) / len(amounts)
            intervals = [
                (dated[i]["date"] - dated[i - 1]["date"]).days
                for i in range(1, len(dated))
            ]
            days_of_month = [t["date"].day for t in dated]
            freq = detect_frequency(intervals, days_of_month, len(dated))

            signals = []
            if STANDING_ORDER in dated[0]["biz"]:
                signals.append("standing_order")
            amt_var = (max(amounts) - min(amounts)) / avg_amt if avg_amt else 999
            if amt_var <= 0.15:
                signals.append("consistent_amount")
            if len(dated) >= 3 and freq == "monthly":
                signals.append("multiple_monthly_payments")

            biz = dated[0]["biz"]
            category = dated[0]["category"]

            # Filter: need subscription signals OR clear monthly recurrence with consistent amount
            is_sub_keyword = any(
                kw in biz.lower() for kw in SUBSCRIPTION_KEYWORDS + TELECOM_SUBSCRIPTION
            )
            is_standing = STANDING_ORDER in biz
            is_digital_cat = category in SUBSCRIPTION_CATEGORIES
            is_recurring = len(dated) >= 3 and freq in ("monthly", "yearly") and amt_var <= 0.2

            if not (is_sub_keyword or is_standing or (is_digital_cat and len(dated) >= 2) or is_recurring):
                # Special: card fees, lottery - exclude
                if "דמי כרטיס" in biz or "מפעל הפיס" in biz:
                    continue
                if not is_recurring:
                    continue

            # Exclude variable telecom bills that look like usage (Partner with huge variance)
            if "פרטנר" in biz and amt_var > 0.4 and avg_amt > 200:
                continue

            # Pick dominant payment instrument
            inst_counts: dict[tuple, int] = defaultdict(int)
            for t in dated:
                inst_counts[(t["pay_method"], t["pay_id"])] += 1
            top_inst = max(inst_counts, key=inst_counts.get)

            yearly_total = avg_amt * 12 if freq == "monthly" else (avg_amt if freq == "yearly" else avg_amt * 12)
            if freq == "quarterly":
                yearly_total = avg_amt * 4

            alt_names = sorted(set(t["biz"] for t in dated if t["biz"] != biz))

            results.append({
                "merge_key": merge_key,
                "display_name": biz,
                "alternate_names": alt_names,
                "frequency": freq,
                "avg_monthly_amount": round(avg_amt if freq != "yearly" else avg_amt / 12, 2),
                "yearly_total": round(yearly_total, 2),
                "payment_per_period": round(avg_amt, 2),
                "start_date": dated[0]["date"].strftime("%Y-%m-%d"),
                "end_date": dated[-1]["date"].strftime("%Y-%m-%d"),
                "payment_count": len(dated),
                "payment_method": payment_method_label(*top_inst),
                "category": category,
                "reason": subscription_reason(signals, biz, category, freq, len(dated)),
                "amount_range": [round(min(amounts), 2), round(max(amounts), 2)],
            })

    results.sort(key=lambda x: (-x["yearly_total"], x["display_name"]))
    return results


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        r"c:\Users\Owner\My Drive\Personal\Finances\2026-06-26 - RiseUp Export.csv"
    )
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("subscription_analysis.json")
    data = analyze_csv(path)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Found {len(data)} subscriptions -> {out}")
