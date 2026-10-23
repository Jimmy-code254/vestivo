-- Contributions tracking per round
CREATE TABLE public.chama_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  round_number integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(chama_id, user_id, round_number)
);

ALTER TABLE public.chama_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chama contributions" ON public.chama_contributions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own contributions" ON public.chama_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contributions" ON public.chama_contributions
  FOR UPDATE USING (auth.uid() = user_id);

-- Group chat messages
CREATE TABLE public.chama_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chama_id uuid NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chama_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chama messages" ON public.chama_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.chama_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chama_messages;