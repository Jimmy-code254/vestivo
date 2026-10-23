DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Admins can view all wallets" ON public.wallets
FOR SELECT TO authenticated
USING (public.has_role('admin'));

CREATE POLICY "Admins can update chamas" ON public.chamas
FOR UPDATE TO authenticated
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));
