
-- Chamas table
CREATE TABLE public.chamas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_id uuid NOT NULL,
  contribution_amount numeric NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','bi-weekly','monthly')),
  max_members integer NOT NULL DEFAULT 10,
  invite_code text UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  current_round integer NOT NULL DEFAULT 0,
  total_rounds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chamas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chamas viewable by authenticated" ON public.chamas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create chamas" ON public.chamas FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update chamas" ON public.chamas FOR UPDATE USING (auth.uid() = creator_id);

-- Chama members table
CREATE TABLE public.chama_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid REFERENCES public.chamas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  payout_position integer,
  total_contributed numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','left','removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chama_id, user_id)
);

ALTER TABLE public.chama_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by authenticated" ON public.chama_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join chamas" ON public.chama_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.chama_members FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_chamas_updated_at BEFORE UPDATE ON public.chamas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
