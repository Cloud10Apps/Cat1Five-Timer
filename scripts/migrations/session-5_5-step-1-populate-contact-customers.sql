-- Session 5.5 migration step (b) — populate contact_customers from contacts.customer_id
--
-- DEPLOY SEQUENCE:
--   (a) drizzle-kit push:    creates contact_customers table (additive, no destructive ops)
--   (b) RUN THIS SCRIPT:     fills the join table from existing contacts.customer_id values
--   (c) git push:            Railway deploys API that uses the join table as source of truth
--                            (API also dual-writes customer_id during this transition so existing
--                            NOT NULL constraint stays satisfied)
--   (d) verify in production
--   (e) future step-2 session: remove customer_id from contacts schema, push to drop the column
--
-- This script is idempotent — safe to re-run; ON CONFLICT DO NOTHING skips already-migrated rows.

INSERT INTO contact_customers (contact_id, customer_id, created_at)
SELECT id, customer_id, created_at FROM contacts
ON CONFLICT ON CONSTRAINT contact_customer_unique DO NOTHING;
