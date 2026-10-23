ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'completed'
    CHECK (payment_status IN ('pending', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS provider_checkout_id text;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_provider_checkout_id_key
  ON public.wallet_transactions(provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own contributions" ON public.chama_contributions;
DROP POLICY IF EXISTS "Users can update own contributions" ON public.chama_contributions;
DROP POLICY IF EXISTS "Users can update own membership" ON public.chama_members;
DROP POLICY IF EXISTS "Users can join chamas" ON public.chama_members;

REVOKE INSERT, UPDATE ON public.wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.chama_contributions FROM anon, authenticated;
REVOKE UPDATE ON public.chama_members FROM anon, authenticated;
REVOKE UPDATE ON public.chamas FROM anon, authenticated;
GRANT UPDATE (name, description) ON public.chamas TO authenticated;

CREATE POLICY "Users can join chamas" ON public.chama_members
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.chamas AS chama
    WHERE chama.id = chama_id
      AND chama.status = 'active'
      AND chama.current_round = 1
      AND (
        SELECT count(*)
        FROM public.chama_members AS active_member
        WHERE active_member.chama_id = chama.id
          AND active_member.status = 'active'
      ) < chama.max_members
  )
  AND (
    (role = 'member' AND payout_position IS NULL)
    OR (
      role = 'admin'
      AND payout_position = 1
      AND EXISTS (
        SELECT 1 FROM public.chamas
        WHERE id = chama_id AND creator_id = auth.uid()
      )
    )
  )
);

UPDATE public.chamas
SET current_round = 1
WHERE current_round = 0 AND status = 'active';

ALTER TABLE public.chamas
  ALTER COLUMN current_round SET DEFAULT 1;

CREATE OR REPLACE FUNCTION public.protect_chama_round_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.current_round IS DISTINCT FROM OLD.current_round
    AND current_setting('vestivo.allow_chama_round_update', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Chama rounds can only advance through the payout workflow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_chama_round_updates ON public.chamas;
CREATE TRIGGER protect_chama_round_updates
  BEFORE UPDATE ON public.chamas
  FOR EACH ROW EXECUTE FUNCTION public.protect_chama_round_updates();

CREATE OR REPLACE FUNCTION public.complete_mpesa_deposit(p_checkout_request_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction public.wallet_transactions%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF NULLIF(trim(p_checkout_request_id), '') IS NULL THEN
    RAISE EXCEPTION 'Checkout request is required';
  END IF;

  SELECT * INTO v_transaction
  FROM public.wallet_transactions
  WHERE provider_checkout_id = p_checkout_request_id
    AND type = 'deposit'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_transaction.payment_status = 'completed' THEN
    RETURN 'already_completed';
  END IF;
  IF v_transaction.payment_status <> 'pending' THEN
    RETURN 'not_pending';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE id = v_transaction.wallet_id
    AND user_id = v_transaction.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet does not match the pending deposit';
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_transaction.amount
  WHERE id = v_wallet.id;

  UPDATE public.wallet_transactions
  SET payment_status = 'completed',
      description = 'M-Pesa deposit verified by Safaricom'
  WHERE id = v_transaction.id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_transaction.user_id,
    'Deposit Confirmed',
    'KES ' || to_char(v_transaction.amount, 'FM999,999,990.00')
      || ' deposited via M-Pesa.',
    'contribution',
    '/wallet'
  );

  RETURN 'completed';
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_mpesa_deposit(
  p_checkout_request_id text,
  p_failure_description text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction public.wallet_transactions%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT * INTO v_transaction
  FROM public.wallet_transactions
  WHERE provider_checkout_id = p_checkout_request_id
    AND type = 'deposit'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_transaction.payment_status <> 'pending' THEN
    RETURN 'not_pending';
  END IF;

  UPDATE public.wallet_transactions
  SET payment_status = 'failed',
      description = 'M-Pesa deposit failed: ' || left(COALESCE(p_failure_description, 'Payment was not completed'), 300)
  WHERE id = v_transaction.id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_transaction.user_id,
    'Payment Failed',
    'M-Pesa deposit was not completed.',
    'system',
    '/wallet'
  );

  RETURN 'failed';
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_penalty_from_wallet(p_penalty_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_penalty public.penalties%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_penalty
  FROM public.penalties
  WHERE id = p_penalty_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_penalty.status <> 'unpaid' THEN
    RAISE EXCEPTION 'This penalty is not available for payment';
  END IF;
  IF v_penalty.amount <= 0 THEN
    RAISE EXCEPTION 'Penalty amount must be positive';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < v_penalty.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_penalty.amount
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, description, reference)
  VALUES (
    v_wallet.id,
    v_user_id,
    'penalty',
    v_penalty.amount,
    'Penalty payment: ' || v_penalty.reason,
    'PENALTY-' || v_penalty.id::text
  );

  UPDATE public.penalties
  SET status = 'paid', paid_at = now()
  WHERE id = v_penalty.id;

  RETURN v_penalty.amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_chama_contribution(
  p_chama_id uuid,
  p_round_number integer
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_chama public.chamas%ROWTYPE;
  v_membership public.chama_members%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_contribution public.chama_contributions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_chama
  FROM public.chamas
  WHERE id = p_chama_id
  FOR UPDATE;

  IF NOT FOUND OR v_chama.status <> 'active'
    OR p_round_number <> v_chama.current_round THEN
    RAISE EXCEPTION 'This chama round is not available for contributions';
  END IF;

  SELECT * INTO v_membership
  FROM public.chama_members
  WHERE chama_id = p_chama_id
    AND user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'An active chama membership is required';
  END IF;

  SELECT * INTO v_contribution
  FROM public.chama_contributions
  WHERE chama_id = p_chama_id
    AND user_id = v_user_id
    AND round_number = p_round_number
  FOR UPDATE;

  IF FOUND AND v_contribution.status = 'paid' THEN
    RAISE EXCEPTION 'This contribution has already been paid';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < v_chama.contribution_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_chama.contribution_amount
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, description, reference)
  VALUES (
    v_wallet.id,
    v_user_id,
    'contribution',
    v_chama.contribution_amount,
    'Chama contribution - Round ' || p_round_number,
    'CHAMA-' || p_chama_id::text || '-R' || p_round_number || '-' || v_user_id::text
  );

  INSERT INTO public.chama_contributions (chama_id, user_id, round_number, amount, status, paid_at)
  VALUES (p_chama_id, v_user_id, p_round_number, v_chama.contribution_amount, 'paid', now())
  ON CONFLICT (chama_id, user_id, round_number)
  DO UPDATE SET amount = EXCLUDED.amount, status = 'paid', paid_at = now();

  UPDATE public.chama_members
  SET total_contributed = total_contributed + v_chama.contribution_amount
  WHERE id = v_membership.id;

  RETURN v_chama.contribution_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_chama_payout(
  p_chama_id uuid,
  p_round_number integer
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_chama public.chamas%ROWTYPE;
  v_recipient public.chama_members%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_member_count integer;
  v_paid_count integer;
  v_payout_amount numeric;
  v_next_round integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_chama
  FROM public.chamas
  WHERE id = p_chama_id
  FOR UPDATE;

  IF NOT FOUND OR v_chama.creator_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the chama creator can process its payout';
  END IF;
  IF v_chama.status <> 'active' OR v_chama.current_round <> p_round_number THEN
    RAISE EXCEPTION 'This chama round has already been processed or is unavailable';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM public.chama_members
  WHERE chama_id = p_chama_id AND status = 'active';

  SELECT count(DISTINCT contribution.user_id) INTO v_paid_count
  FROM public.chama_contributions AS contribution
  JOIN public.chama_members AS membership
    ON membership.chama_id = contribution.chama_id
    AND membership.user_id = contribution.user_id
    AND membership.status = 'active'
  WHERE contribution.chama_id = p_chama_id
    AND contribution.round_number = p_round_number
    AND contribution.status = 'paid';

  IF v_member_count = 0 OR v_paid_count <> v_member_count THEN
    RAISE EXCEPTION 'All active chama members must pay before payout';
  END IF;

  SELECT * INTO v_recipient
  FROM public.chama_members
  WHERE chama_id = p_chama_id
    AND payout_position = p_round_number
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active payout recipient is assigned to this round';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.chama_members
    WHERE chama_id = p_chama_id
      AND payout_position = p_round_number
      AND status = 'active'
      AND id <> v_recipient.id
  ) THEN
    RAISE EXCEPTION 'Multiple active payout recipients are assigned to this round';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE type = 'payout'
      AND reference = 'MGR-' || p_chama_id::text || '-R' || p_round_number
  ) THEN
    RAISE EXCEPTION 'A payout has already been recorded for this round';
  END IF;

  v_payout_amount := v_chama.contribution_amount * v_member_count;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_recipient.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The payout recipient does not have a wallet';
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_payout_amount
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, description, reference)
  VALUES (
    v_wallet.id,
    v_recipient.user_id,
    'payout',
    v_payout_amount,
    'Merry-Go-Round payout - Round ' || p_round_number || ' of ' || v_chama.total_rounds,
    'MGR-' || p_chama_id::text || '-R' || p_round_number
  );

  v_next_round := p_round_number + 1;
  PERFORM set_config('vestivo.allow_chama_round_update', 'on', true);
  UPDATE public.chamas
  SET current_round = v_next_round,
      status = CASE WHEN v_next_round > total_rounds THEN 'completed' ELSE status END
  WHERE id = p_chama_id;

  RETURN v_payout_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.randomize_chama_payout_order(p_chama_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_chama public.chamas%ROWTYPE;
  v_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT * INTO v_chama
  FROM public.chamas
  WHERE id = p_chama_id
  FOR UPDATE;

  IF NOT FOUND OR v_chama.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the chama creator can randomize payout order';
  END IF;
  IF v_chama.status <> 'active' OR v_chama.current_round <> 1
    OR EXISTS (
      SELECT 1 FROM public.chama_contributions
      WHERE chama_id = p_chama_id AND status = 'paid'
    ) THEN
    RAISE EXCEPTION 'Payout order can only be randomized before the first round is paid';
  END IF;

  WITH randomized AS (
    SELECT id, row_number() OVER (ORDER BY gen_random_uuid())::integer AS new_position
    FROM public.chama_members
    WHERE chama_id = p_chama_id AND status = 'active'
  )
  UPDATE public.chama_members AS membership
  SET payout_position = randomized.new_position
  FROM randomized
  WHERE membership.id = randomized.id;

  GET DIAGNOSTICS v_member_count = ROW_COUNT;
  RETURN v_member_count;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mpesa_deposit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_mpesa_deposit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_mpesa_deposit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_mpesa_deposit(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.pay_penalty_from_wallet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pay_chama_contribution(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_chama_payout(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.randomize_chama_payout_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_penalty_from_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_chama_contribution(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_chama_payout(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.randomize_chama_payout_order(uuid) TO authenticated;
