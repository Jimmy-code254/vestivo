ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS chama_id uuid REFERENCES public.chamas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS loans_chama_id_idx ON public.loans(chama_id);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS invite_code text;

UPDATE public.events
SET invite_code = upper(substr(md5(gen_random_uuid()::text), 1, 6))
WHERE invite_code IS NULL;

ALTER TABLE public.events
  ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS events_invite_code_key ON public.events(invite_code);

CREATE OR REPLACE FUNCTION public.is_active_chama_member(p_chama_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chama_members
    WHERE chama_id = p_chama_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_chama_member(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_loan_borrower(p_loan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.loans
    WHERE id = p_loan_id
      AND borrower_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_loan_borrower(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_loan_borrower(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_for_chama_loan(
  p_chama_id uuid,
  p_guarantor_id uuid,
  p_amount numeric,
  p_interest_rate numeric,
  p_duration_months integer,
  p_purpose text,
  p_guarantee_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_borrower_id uuid := auth.uid();
  v_loan_id uuid;
BEGIN
  IF v_borrower_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0
    OR p_interest_rate IS NULL OR p_interest_rate < 0
    OR p_duration_months IS NULL OR p_duration_months <= 0
    OR p_guarantee_amount IS NULL OR p_guarantee_amount <= 0
    OR p_guarantee_amount > p_amount THEN
    RAISE EXCEPTION 'Enter valid loan and guarantee details';
  END IF;

  IF p_guarantor_id IS NULL OR p_guarantor_id = v_borrower_id THEN
    RAISE EXCEPTION 'Choose another active member as guarantor';
  END IF;

  IF NOT public.is_active_chama_member(p_chama_id, v_borrower_id)
    OR NOT public.is_active_chama_member(p_chama_id, p_guarantor_id) THEN
    RAISE EXCEPTION 'The borrower and guarantor must be active members of the selected chama';
  END IF;

  INSERT INTO public.loans (
    borrower_id,
    chama_id,
    amount,
    interest_rate,
    duration_months,
    status,
    purpose,
    total_repayment
  )
  VALUES (
    v_borrower_id,
    p_chama_id,
    p_amount,
    p_interest_rate,
    p_duration_months,
    'pending',
    NULLIF(trim(COALESCE(p_purpose, '')), ''),
    p_amount + (p_amount * (p_interest_rate / 100 / 12) * p_duration_months)
  )
  RETURNING id INTO v_loan_id;

  INSERT INTO public.loan_guarantors (loan_id, guarantor_id, amount)
  VALUES (v_loan_id, p_guarantor_id, p_guarantee_amount);

  RETURN v_loan_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_for_chama_loan(uuid, uuid, numeric, numeric, integer, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_for_chama_loan(uuid, uuid, numeric, numeric, integer, text, numeric) TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;
DROP POLICY IF EXISTS "Users can insert guarantor requests" ON public.loan_guarantors;

CREATE POLICY "Guarantors can view guaranteed loans" ON public.loans
FOR SELECT TO authenticated
USING (
  auth.uid() = borrower_id
  OR EXISTS (
    SELECT 1
    FROM public.loan_guarantors
    WHERE loan_id = loans.id
      AND guarantor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Borrowers can view their loan guarantors" ON public.loan_guarantors;
CREATE POLICY "Borrowers and guarantors can view guarantee requests" ON public.loan_guarantors
FOR SELECT TO authenticated
USING (
  auth.uid() = guarantor_id
  OR public.is_loan_borrower(loan_id)
);

CREATE OR REPLACE FUNCTION public.validate_loan_guarantor_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.guarantor_id THEN
    RAISE EXCEPTION 'Only the selected guarantor can respond';
  END IF;

  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'This guarantee request has already been answered';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.loan_id IS DISTINCT FROM OLD.loan_id
    OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the guarantee decision can be changed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_loan_when_guarantee_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    UPDATE public.loans
    SET status = 'rejected'
    WHERE id = NEW.loan_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_loan_guarantor_decision ON public.loan_guarantors;
CREATE TRIGGER validate_loan_guarantor_decision
  BEFORE UPDATE ON public.loan_guarantors
  FOR EACH ROW EXECUTE FUNCTION public.validate_loan_guarantor_decision();

DROP TRIGGER IF EXISTS reject_loan_after_guarantor_rejection ON public.loan_guarantors;
CREATE TRIGGER reject_loan_after_guarantor_rejection
  AFTER UPDATE OF status ON public.loan_guarantors
  FOR EACH ROW EXECUTE FUNCTION public.reject_loan_when_guarantee_rejected();
