-- 128_property_utilities_arnona_type.sql
-- Adds Arnona as a supported property utility type.

ALTER TYPE property_utility_type ADD VALUE IF NOT EXISTS 'arnona' AFTER 'gas';
