-- Enforce one therapist per email address (case-insensitive), matching the
-- existing "phone" unique constraint. Both the registration form and admin
-- edit already lowercase email before writing, so this also guards against
-- any future write path that forgets to normalize case.
--
-- Prerequisite: no duplicate emails may exist in the table already (verified
-- clean as of 2026-07-14 — a pre-existing duplicate pair was found and
-- removed before this migration was written).

CREATE UNIQUE INDEX IF NOT EXISTS therapists_email_unique_ci ON therapists (lower(email));
