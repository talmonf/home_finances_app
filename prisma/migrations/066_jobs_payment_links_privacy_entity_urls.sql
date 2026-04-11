-- Job ↔ bank account / credit card (optional); household entity-URL panels toggle.

ALTER TABLE jobs
  ADD COLUMN bank_account_id UUID,
  ADD COLUMN credit_card_id UUID;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_bank_account_id_fkey
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_credit_card_id_fkey
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;

CREATE INDEX idx_jobs_bank_account_id ON jobs(bank_account_id);
CREATE INDEX idx_jobs_credit_card_id ON jobs(credit_card_id);

ALTER TABLE households
  ADD COLUMN show_entity_url_panels BOOLEAN NOT NULL DEFAULT true;
