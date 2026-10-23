-- Fines & Penalties table
CREATE TABLE public.penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  penalty_type TEXT NOT NULL DEFAULT 'late_payment', -- 'late_payment', 'missed_meeting', 'misconduct', 'custom'
  status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid', 'waived'
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chama members can view their chama penalties" ON public.penalties
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.chama_members
      WHERE chama_id = penalties.chama_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Chama creators can manage penalties" ON public.penalties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chamas
      WHERE id = penalties.chama_id
      AND creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chamas
      WHERE id = penalties.chama_id
      AND creator_id = auth.uid()
    )
  );

CREATE INDEX idx_penalties_chama ON public.penalties(chama_id);
CREATE INDEX idx_penalties_user ON public.penalties(user_id);
CREATE INDEX idx_penalties_status ON public.penalties(status);

CREATE TRIGGER update_penalties_updated_at
  BEFORE UPDATE ON public.penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
