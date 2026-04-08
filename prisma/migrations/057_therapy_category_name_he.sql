-- Bilingual labels for consultation types and expense categories (Hebrew UI uses name_he when set)

ALTER TABLE therapy_consultation_types
  ADD COLUMN IF NOT EXISTS name_he TEXT;

ALTER TABLE therapy_expense_categories
  ADD COLUMN IF NOT EXISTS name_he TEXT;

-- Backfill Hebrew for default English names (idempotent updates)
UPDATE therapy_consultation_types SET name_he = 'פגישה ראשונית' WHERE name = 'Initial consultation' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_consultation_types SET name_he = 'מעקב' WHERE name = 'Follow-up' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_consultation_types SET name_he = 'הדרכה / דיון מקרה' WHERE name = 'Supervision / case discussion' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_consultation_types SET name_he = 'פגישה מנהלית' WHERE name = 'Administrative meeting' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_consultation_types SET name_he = 'אחר' WHERE name = 'Other' AND (name_he IS NULL OR name_he = '');

UPDATE therapy_expense_categories SET name_he = 'שכירות מרפאה' WHERE name = 'Office & clinic rent' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'ציוד' WHERE name = 'Supplies' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'השתלמות מקצועית' WHERE name = 'Professional development' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'ביטוח' WHERE name = 'Insurance' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'חשבונות משק בית' WHERE name = 'Utilities' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'שיווק' WHERE name = 'Marketing' AND (name_he IS NULL OR name_he = '');
UPDATE therapy_expense_categories SET name_he = 'אחר' WHERE name = 'Other' AND (name_he IS NULL OR name_he = '');
