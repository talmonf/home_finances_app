#!/usr/bin/env python3
"""Curated subscription list for user review."""
import csv
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DEFAULT_CSV = Path(
    r"c:\Users\Owner\My Drive\Personal\Finances\2026-06-26 - RiseUp Export.csv"
)

MERGE = {
    "Claude AI": [r"CLAUDE", r"ANTHROPIC"],
    "Cursor IDE": [r"CURSOR"],
    "OpenAI / ChatGPT": [r"OPENAI", r"CHATGPT"],
    "Google YouTube Premium": [r"YOUTUBE"],
    "Google One (~12 ILS/mo tier)": [r"GOOGLE ONE"],
    "Google Leap Fitness": [r"LEAP FITNESS"],
    "Google Fasting app": [r"FASTING"],
    "Google Call Recorder": [r"CALL RECORDER"],
    "Apple iCloud / App Store subs": [r"APPLE\.COM"],
    "LinkedIn Premium (PayPal)": [r"LINKEDIN"],
    "Zoom (annual plan)": [r"ZOOM"],
    "Canva": [r"CANVA"],
    "Render.com hosting": [r"RENDER"],
    "Vysor": [r"VYSOR"],
    "RiseUp app": [r"RISEUP", r"riseup", r"מנוי riseup"],
    "Makor Rishon newspaper": [r"מקור ראשון"],
    "Midah website": [r"אתר מידה"],
    "Israeli Tanakh app": [r"תנך ישראלי"],
    "Panima / Otiyot / Mada VTevel magazines": [r"פנימה", r"אותיות"],
    "Telrom-Koter": [r"טלרום"],
    "Bezeq internet ~154 ILS (standing order)": [r"בזק"],
    "Bezeq phone ~29 ILS (standing order)": [r"בזק"],
    "Bezeq line ~50 ILS (standing order)": [r"בזק"],
    "Partner mobile ~116 ILS line": [r"פרטנר"],
    "Hever club membership (דמי חבר מועדון חבר)": [r"דמי חבר מועדון חבר"],
    "AI at Eye Level (בינה מלאכותית בגובה העיניים)": [r"בינה מלאכותית"],
    "Brain Bina (בריין בינה)": [r"בריין בינה"],
    "Bar Kayama (בר קיימא)": [r"בר קיימא"],
    "Henriko (הנריקו)": [r"הנריקו"],
    "iEffect (אי-פקט)": [r"אי-פקט", r"אי.פקט"],
    "TribalPages genealogy": [r"TRIBAL"],
}

REASONS = {
    "Claude AI": "Merchant contains SUBSCRIPTION; monthly ~$20 USD; דיגיטל/מנויים category",
    "Cursor IDE": "CURSOR AI POWERED IDE; monthly ~$20 USD; דיגיטל category",
    "OpenAI / ChatGPT": "OPENAI charge; likely ChatGPT Plus",
    "Google YouTube Premium": "Recurring Google charge; stable 23.90 ILS; דיגיטל",
    "Google One (~12 ILS/mo tier)": "Recurring Google One storage; stable ~12 ILS",
    "Google Leap Fitness": "Google Play app subscription; stable ~14 ILS",
    "Google Fasting app": "GOOGLE*FASTING INTERM; app subscription",
    "Google Call Recorder": "Google Play app; recurring charge",
    "Apple iCloud / App Store subs": "APPLE.COM/BILL; multiple App Store / iCloud tiers",
    "LinkedIn Premium (PayPal)": "PAYPAL *LINKEDIN; מנויים category",
    "Zoom (annual plan)": "~552 ILS once/year per seat (orig ~$159.90); merged ZOOM.COM / ZOOM.US / PayPal",
    "Canva": "PAYPAL *CANVAPTYLIM; דיגיטל category; consecutive monthly payments",
    "Render.com hosting": "RENDER.COM; cloud hosting for room-management app (per note)",
    "Vysor": "VYSOR; מנויים; note says 'צריך לבטל'",
    "RiseUp app": "מנוי riseup; monthly then possible plan change",
    "Makor Rishon newspaper": "מנויים in merchant name; monthly newspaper",
    "Midah website": "אתר מידה; monthly digital media",
    "Israeli Tanakh app": "תנך ישראלי; app subscription ~97 ILS",
    "Panima / Otiyot / Mada VTevel magazines": "Combined magazine bundle; ~52 ILS monthly",
    "Telrom-Koter": "Digital publication; דיגיטל",
    "Bezeq internet ~154 ILS (standing order)": "B בזק - הוראת קבע; stable ~154 ILS",
    "Bezeq phone ~29 ILS (standing order)": "B בזק - הוראת קבע; stable ~29 ILS",
    "Bezeq line ~50 ILS (standing order)": "B בזק - הוראת קבע; stable ~50 ILS (note: מעלית הבנין)",
    "Partner mobile ~116 ILS line": "פרטנר תקשורת; stable ~116 ILS monthly line",
    "Hever club membership (דמי חבר מועדון חבר)": "Membership fee in name; 20 ILS/month",
    "AI at Eye Level (בינה מלאכותית בגובה העיניים)": "Recurring 67 ILS; possible AI newsletter/service",
    "Brain Bina (בריין בינה)": "Recurring 27 ILS; unclear service",
    "Bar Kayama (בר קיימא)": "Recurring 120 ILS; unclear if subscription",
    "Henriko (הנריקו)": "Recurring 25 ILS; unclear service",
    "iEffect (אי-פקט)": "Recurring ~175 ILS for 5 months then stopped",
    "TribalPages genealogy": "PAYPAL *TRIBALPAGES; genealogy site (only 1 payment in export)",
}


def parse_date(s: str):
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y")
    except ValueError:
        return None


def parse_amt(row: dict):
    for key in ("סכום", "סכום מקורי"):
        try:
            v = float(str(row.get(key, "")).replace(",", ""))
            if v < 0:
                return abs(v)
        except ValueError:
            pass
    return None


def load_rows(csv_path: Path):
    rows = []
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            pn = (row.get("מספר התשלום") or "").strip()
            pt = (row.get("מספר תשלומים כולל") or "").strip()
            if pn and pt:
                try:
                    if int(pt) > 1 and int(pn) <= int(pt):
                        continue
                except ValueError:
                    pass
            amt = parse_amt(row)
            if amt is None:
                continue
            rows.append(
                {
                    "biz": row["שם העסק"].strip(),
                    "amt": amt,
                    "date": parse_date(row.get("תאריך התשלום") or ""),
                    "cat": row["קטגוריה בתזרים"].strip(),
                    "m": row["אמצעי התשלום"].strip(),
                    "id": row["אמצעי זיהוי התשלום"].strip(),
                    "notes": (row.get("הערות") or "").strip(),
                }
            )
    return rows


def export_window(rows: list) -> tuple[datetime | None, datetime | None, tuple[int, int] | None]:
    """Return (min_date, max_date, active_month) where active_month is (year, month)."""
    dated = [r["date"] for r in rows if r["date"]]
    if not dated:
        return None, None, None
    min_d, max_d = min(dated), max(dated)
    return min_d, max_d, (max_d.year, max_d.month)


def paid_in_active_month(dated: list, active_month: tuple[int, int] | None) -> bool:
    if not active_month:
        return False
    y, m = active_month
    return any(x["date"].year == y and x["date"].month == m for x in dated)


def match_group(biz: str, patterns: list[str]) -> bool:
    return any(re.search(p, biz, re.I) for p in patterns)


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


def filter_matched(label: str, matched: list) -> list:
    if "~154" in label:
        return [x for x in matched if 130 <= x["amt"] <= 170 and "בזק" in x["biz"]]
    if "~29" in label:
        return [x for x in matched if 25 <= x["amt"] <= 35 and "בזק" in x["biz"]]
    if "~50" in label:
        return [x for x in matched if 45 <= x["amt"] <= 55 and "בזק" in x["biz"]]
    if "~116" in label:
        return [x for x in matched if 110 <= x["amt"] <= 125]
    if "Google One (~12" in label:
        return [x for x in matched if x["amt"] <= 25]
    return matched


def payments_per_calendar_year(dated: list) -> dict[int, int]:
    counts: dict[int, int] = defaultdict(int)
    for x in dated:
        counts[x["date"].year] += 1
    return dict(counts)


def infer_dual_annual_members(dated: list, intervals: list[int]) -> int | None:
    """
    If a service is charged ~twice per calendar year with similar amounts,
    treat as annual subscriptions for two family members.
    """
    if len(dated) < 2:
        return None
    by_year = payments_per_calendar_year(dated)
    if not by_year:
        return None
    counts = list(by_year.values())
    # Need at least one year with 2 payments, or average ~2/year across full years
    full_years = [y for y, c in by_year.items() if c >= 1]
    if not full_years:
        return None
    avg_per_year = sum(by_year[y] for y in full_years) / len(full_years)
    if avg_per_year < 1.4 or avg_per_year > 2.6:
        return None
    # Intervals should not look monthly (not all under 45 days)
    if intervals and sum(1 for i in intervals if i <= 45) / len(intervals) > 0.5:
        return None
    # Amounts reasonably consistent
    amounts = [x["amt"] for x in dated]
    avg = sum(amounts) / len(amounts)
    if avg <= 0:
        return None
    if (max(amounts) - min(amounts)) / avg > 0.2:
        return None
    return 2


def detect_frequency(dated: list, intervals: list[int], dual_members: int | None) -> str:
    if dual_members:
        return "yearly"
    if not intervals:
        return "monthly"
    avg_interval = sum(intervals) / len(intervals)
    if avg_interval >= 300:
        return "yearly"
    if avg_interval >= 150 and len(dated) <= 4:
        return "yearly"
    if 25 <= avg_interval <= 40:
        return "monthly"
    if avg_interval <= 45 and len(dated) >= 3:
        return "monthly"
    return "monthly" if avg_interval < 150 else "yearly"


def compute_yearly_total(
    *,
    frequency: str,
    per_payment: float,
    total_paid: float,
    is_active: bool,
    dual_members: int | None,
    payments: int,
) -> float:
    """
    yearly_total_ils:
    - Active monthly (paid in export's last month): projected run-rate = per_payment * 12
    - Dual annual family members: per_payment * member_count
    - Single annual: per_payment (one charge per year)
    - Otherwise: actual sum paid in export (no projection)
    """
    if frequency == "monthly" and is_active:
        return round(per_payment * 12, 2)
    if frequency == "yearly" and dual_members:
        return round(per_payment * dual_members, 2)
    if frequency == "yearly" and is_active:
        return round(per_payment, 2)
    if frequency == "yearly" and payments >= 2:
        # Extrapolate from observed annual cadence when inactive mid-cycle
        return round(per_payment, 2)
    return round(total_paid, 2)


def build_entry(
    label: str,
    dated: list,
    reason: str,
    active_month: tuple[int, int] | None,
) -> dict:
    amounts = [x["amt"] for x in dated]
    total_paid = sum(amounts)
    per_payment = total_paid / len(amounts)
    intervals = [
        (dated[i]["date"] - dated[i - 1]["date"]).days for i in range(1, len(dated))
    ]
    dual_members = infer_dual_annual_members(dated, intervals)
    frequency = detect_frequency(dated, intervals, dual_members)
    is_active = paid_in_active_month(dated, active_month)

    if frequency == "monthly":
        avg_monthly = round(per_payment, 2)
    elif dual_members:
        avg_monthly = round((per_payment * dual_members) / 12, 2)
    else:
        avg_monthly = round(per_payment / 12, 2)

    yearly_total = compute_yearly_total(
        frequency=frequency,
        per_payment=round(per_payment, 2),
        total_paid=total_paid,
        is_active=is_active,
        dual_members=dual_members,
        payments=len(dated),
    )

    inst_counts: dict[tuple, int] = defaultdict(int)
    for x in dated:
        inst_counts[(x["m"], x["id"])] += 1
    top = max(inst_counts, key=inst_counts.get)
    alt = sorted(set(x["biz"] for x in dated))

    end_display = (
        "ongoing"
        if is_active
        else dated[-1]["date"].strftime("%d/%m/%Y")
    )

    entry = {
        "name": label,
        "frequency": frequency,
        "avg_monthly_ils": avg_monthly,
        "yearly_total_ils": yearly_total,
        "total_paid_in_export_ils": round(total_paid, 2),
        "per_payment_ils": round(per_payment, 2),
        "start": dated[0]["date"].strftime("%d/%m/%Y"),
        "end": end_display,
        "is_active": is_active,
        "payments": len(dated),
        "payment_method": pm_label(*top),
        "merged_from": alt if len(alt) > 1 else [],
        "amount_range": [round(min(amounts), 2), round(max(amounts), 2)],
        "reason": reason,
        "confidence": "high" if len(dated) >= 3 else "medium",
    }
    if dual_members:
        entry["annual_family_members"] = dual_members
        entry["reason"] = (
            f"{reason}; ~{dual_members} payments/year → likely annual plan "
            f"for {dual_members} family members"
        )
    if not is_active and yearly_total == round(total_paid, 2) and frequency == "monthly":
        entry["yearly_total_note"] = (
            "Actual sum in export only — subscription not active in export's last month; "
            "not projected to a full year"
        )
    return entry


def main():
    csv_path = DEFAULT_CSV
    rows = load_rows(csv_path)
    _, _, active_month = export_window(rows)
    results = []

    for label, patterns in MERGE.items():
        matched = [x for x in rows if match_group(x["biz"], patterns)]
        matched = filter_matched(label, matched)
        dated = sorted([x for x in matched if x["date"]], key=lambda x: x["date"])
        if len(dated) < 2 and label not in ("OpenAI / ChatGPT", "TribalPages genealogy"):
            continue
        if not dated:
            continue
        results.append(
            build_entry(label, dated, REASONS.get(label, "recurring pattern"), active_month)
        )

    go80 = [x for x in rows if "GOOGLE ONE" in x["biz"].upper() and x["amt"] >= 70]
    if go80:
        dated = sorted([x for x in go80 if x["date"]], key=lambda x: x["date"])
        results.append(
            build_entry(
                "Google One (annual ~80 ILS)",
                dated,
                "80 ILS charge ~yearly (likely annual Google One tier)",
                active_month,
            )
        )

    for band_label, lo, hi in [
        ("Partner ~280 ILS line (variable usage?)", 250, 310),
        ("Partner variable bill (210–572 ILS)", 200, 600),
    ]:
        sub = [
            x
            for x in rows
            if "פרטנר" in x["biz"] and lo <= x["amt"] <= hi and not (110 <= x["amt"] <= 125)
        ]
        dated = sorted([x for x in sub if x["date"]], key=lambda x: x["date"])
        if len(dated) >= 2:
            entry = build_entry(
                band_label,
                dated,
                "Partner telecom; amount varies — may include usage, not pure subscription",
                active_month,
            )
            entry["confidence"] = "low"
            results.append(entry)

    results.sort(key=lambda x: (-x["yearly_total_ils"], x["name"]))
    out = Path(__file__).resolve().parent.parent / "subscription_curated.json"
    meta = {
        "export_active_month": f"{active_month[1]:02d}/{active_month[0]}" if active_month else None,
        "active_rule": "Paid in export's last month → is_active=true, end=ongoing",
        "yearly_total_rule": (
            "Active monthly: per_payment×12; dual annual: per_payment×2; "
            "otherwise actual sum in export"
        ),
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "subscriptions": results}, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(results)} entries to {out}")
    print(f"Export active month: {meta['export_active_month']}")

    for s in results:
        if s["name"] in ("Canva", "OpenAI / ChatGPT", "Zoom (annual plan)"):
            print(
                f"{s['name']}: freq={s['frequency']} active={s['is_active']} "
                f"paid={s['total_paid_in_export_ils']} yearly={s['yearly_total_ils']} "
                f"end={s['end']}"
                + (
                    f" members={s.get('annual_family_members')}"
                    if s.get("annual_family_members")
                    else ""
                )
            )


if __name__ == "__main__":
    main()
