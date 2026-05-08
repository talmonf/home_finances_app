# Private Clinic: Month-end receipt linking (manual workflow)

Use this checklist when you need to record one receipt for a completed month (for example, April) and connect it to your clinical activity.

## Goal

- Record the real receipt details (number, date, gross/net, payment method, bank transaction).
- Link all relevant **treatments** to that receipt.
- Review related **consultations** and **travel reports** for the same month from the same receipt context.

## Recommended steps (April example)

1. Go to `Dashboard -> Private clinic -> Receipts`.
2. Click `New receipt`.
3. Fill the receipt details:
   - Job / Program (if relevant)
   - Receipt number
   - Receipt date
   - Gross amount and net amount
   - Recipient and payment method
   - Optional bank transaction link
4. If this is a month-level organization receipt, set:
   - `Covered period start`: `2026-04-01`
   - `Covered period end`: `2026-04-30`
5. Save the receipt.
6. Open the same receipt in edit mode (`Edit` in the receipts list).
7. In `Link treatments to this receipt`, select all April treatments and submit.

## Consultations and travel reports

- In the receipts list, each receipt shows linkage counters:
  - `T` = treatments
  - `C` = consultations
  - `TR` = travel reports
- Click `C` or `TR` to open the corresponding page filtered to that receipt.
- Use those filtered views for month-end review and validation.

## Notes

- Keep **gross** aligned with your operational allocations (treatments/consultations/travel).
- Keep **net** aligned with the actual deposited amount in bank transactions.
- If you use import flows (legacy migration / spreadsheet import), consultation and travel allocations may already be linked and will appear in the same counters.
