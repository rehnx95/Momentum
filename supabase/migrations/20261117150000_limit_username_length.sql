-- Usernames are limited to 20 characters. Signup now generates a 20-character
-- username (7-char prefix + hyphen + 12 id chars), and new/changed usernames
-- longer than 20 characters are rejected.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup () RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := COALESCE(
    NULLIF(REGEXP_REPLACE(LOWER(SPLIT_PART(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g'), ''),
    'user'
  );

  INSERT INTO public.profiles (id, name, username, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), 'User'),
    LEFT(base_username, 7) || '-' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 12),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_username_length () RETURNS TRIGGER LANGUAGE plpgsql
SET
  search_path = public AS $$
BEGIN
  IF NEW.username IS NOT NULL
    AND CHAR_LENGTH(NEW.username) > 20
    AND (TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username)
  THEN
    RAISE EXCEPTION 'Username must be 20 characters or fewer.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_length ON public.profiles;

CREATE TRIGGER profiles_username_length BEFORE INSERT
OR
UPDATE OF username ON public.profiles FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_username_length ();
