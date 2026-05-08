# Private Clinic: Month-end receipt linking

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
5. In the create form, keep `After creating, auto-link entries if selected-period totals match gross` enabled (recommended).
6. Save the receipt.
7. The app opens the new receipt in edit mode and attempts auto-linking for that period:
   - Treatments
   - Consultations
   - Travel entries
8. Review the status message:
   - If totals matched gross, suggested entries are linked automatically.
   - If totals did not match (or period is missing), receipt is created and you can link manually in edit mode.
9. In edit mode, use:
   - `Select all`
   - `Deselect all`
   - `Select suggested (period)`
   for each section (Treatments, Consultations, Travel), then submit.

## Consultations and travel reports

- In the receipts list, each receipt shows linkage counters:
  - `T` = treatments
  - `C` = consultations
  - `TR` = travel reports
- Click `C` or `TR` to open the corresponding page filtered to that receipt.
- Use those filtered views for month-end review and validation.

## Delete and re-test

- You can delete a receipt from the bottom of the receipt edit modal.
- Deletion includes a confirmation prompt.
- Deleting a receipt removes its allocation links (treatments/consultations/travel) but does not delete the underlying entries.

## Notes

- Keep **gross** aligned with your operational allocations (treatments/consultations/travel).
- Keep **net** aligned with the actual deposited amount in bank transactions.
- If you use import flows (legacy migration / spreadsheet import), consultation and travel allocations may already be linked and will appear in the same counters.
