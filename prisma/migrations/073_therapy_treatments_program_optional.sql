-- Treatments may exist without a service program (e.g. jobs with no programs).
ALTER TABLE "therapy_treatments" ALTER COLUMN "program_id" DROP NOT NULL;
