-- Bilingual treatment note labels (Hebrew UI uses note_N_label_he when set)

ALTER TABLE therapy_settings
  ADD COLUMN IF NOT EXISTS note_1_label_he TEXT,
  ADD COLUMN IF NOT EXISTS note_2_label_he TEXT,
  ADD COLUMN IF NOT EXISTS note_3_label_he TEXT;

UPDATE therapy_settings SET note_1_label_he = 'הערה 1' WHERE note_1_label = 'Note 1' AND (note_1_label_he IS NULL OR note_1_label_he = '');
UPDATE therapy_settings SET note_2_label_he = 'הערה 2' WHERE note_2_label = 'Note 2' AND (note_2_label_he IS NULL OR note_2_label_he = '');
UPDATE therapy_settings SET note_3_label_he = 'הערה 3' WHERE note_3_label = 'Note 3' AND (note_3_label_he IS NULL OR note_3_label_he = '');
