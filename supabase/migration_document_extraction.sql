-- Add extracted document fields to therapists
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS nbi_extracted   JSONB,
  ADD COLUMN IF NOT EXISTS tesda_extracted JSONB;

-- nbi_extracted shape:   { controlNumber, fullName, dateIssued, expiryDate }
-- tesda_extracted shape: { certificateNumber, fullName, qualification, dateIssued }
