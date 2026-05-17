-- Session 5.7 schema cleanup — drop NOT NULL on contacts.customer_id
--
-- DEPLOY SEQUENCE:
--   (a) RUN THIS SCRIPT FIRST against Railway production DB. Pure constraint
--       relaxation — additive, fully reversible (ALTER COLUMN SET NOT NULL).
--       Verify in Railway data tab: customer_id should show "Nullable: YES".
--   (b) git push.  Railway redeploys API + UI:
--         - writeContactCustomers helper no longer dual-writes the column.
--         - POST /contacts INSERT no longer sets customer_id.
--         - CreateContactDialog no longer has a Customer field.
--   (c) Verify per the smoke test in Session 5.7 brief.
--
-- The column itself stays in place as a dead historical artifact. A future
-- micro-session can DROP COLUMN once we're confident nothing depends on the
-- old data.

ALTER TABLE contacts ALTER COLUMN customer_id DROP NOT NULL;
