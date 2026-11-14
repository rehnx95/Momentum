CREATE OR REPLACE FUNCTION public.get_public_profile_email(requested_username TEXT)
RETURNS TABLE (email TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth_user.email::TEXT
  FROM public.profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  WHERE auth.uid() IS NOT NULL
    AND profile.onboarding_completed
    AND LOWER(profile.username) = LOWER(BTRIM(requested_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_email(TEXT) TO authenticated;
