
-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

-- Wallet transactions
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'contribution', 'payout', 'penalty', 'loan_disbursement', 'loan_repayment');

CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.wallet_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);
