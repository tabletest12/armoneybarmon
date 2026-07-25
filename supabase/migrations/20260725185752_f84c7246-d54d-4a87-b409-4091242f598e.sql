
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
CREATE POLICY "no client access" ON public.kid_sessions FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
