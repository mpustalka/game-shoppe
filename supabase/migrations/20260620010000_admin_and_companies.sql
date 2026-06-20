-- Admin portal foundation: companies directory + admin account bootstrap.
--
-- This migration is additive and defensive. It:
--   1. Creates a `companies` table the admin portal uses to group stores.
--   2. Ensures the owner account (admin@evileevee.com) can sign in by setting
--      a known password and flagging it as an admin in user metadata.
--
-- The account seeding runs inside an exception-guarded DO block so that an
-- unexpected difference in the managed auth schema can never abort the deploy.

BEGIN;

-- pgcrypto provides crypt()/gen_salt() used to hash the admin password the
-- same way Supabase Auth does (bcrypt).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Directory of companies (stores) that the admin portal manages. Users are
-- associated with a company through their auth metadata (company_id), keeping
-- the auth system as the single source of truth for accounts.
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_unique_idx
  ON companies (LOWER(name));

-- Bootstrap / repair the admin account. Wrapped so any schema mismatch is
-- swallowed rather than failing the migration.
DO $$
DECLARE
  admin_email TEXT := 'admin@evileevee.com';
  admin_password TEXT := 'Pokemon123!';
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = admin_email LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Account already on file: reset its password and mark it as admin.
    UPDATE auth.users
    SET
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('is_admin', true, 'store_name', 'Evil Eevee')
    WHERE id = existing_id;
  ELSE
    -- Account not present yet: create a fully confirmed admin user.
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('is_admin', true, 'store_name', 'Evil Eevee')
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Admin bootstrap skipped: %', SQLERRM;
END;
$$;

COMMIT;
