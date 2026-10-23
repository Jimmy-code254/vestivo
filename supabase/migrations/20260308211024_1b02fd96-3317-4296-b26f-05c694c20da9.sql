
-- Loans table
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid NOT NULL,
  amount numeric NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 10,
  duration_months integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','repaid','defaulted','rejected')),
  purpose text,
  total_repayment numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loans" ON public.loans FOR SELECT USING (auth.uid() = borrower_id);
CREATE POLICY "Users can insert their own loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = borrower_id);
CREATE POLICY "Users can update their own loans" ON public.loans FOR UPDATE USING (auth.uid() = borrower_id);

-- Loan guarantors table
CREATE TABLE public.loan_guarantors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  guarantor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_guarantors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guarantors can view their guarantees" ON public.loan_guarantors FOR SELECT USING (auth.uid() = guarantor_id);
CREATE POLICY "Borrowers can view their loan guarantors" ON public.loan_guarantors FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loans WHERE id = loan_id AND borrower_id = auth.uid())
);
CREATE POLICY "Users can insert guarantor requests" ON public.loan_guarantors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.loans WHERE id = loan_id AND borrower_id = auth.uid())
);
CREATE POLICY "Guarantors can update their status" ON public.loan_guarantors FOR UPDATE USING (auth.uid() = guarantor_id);

-- Events table (merry-go-round, table banking, etc)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'merry_go_round' CHECK (event_type IN ('merry_go_round','table_banking','fundraiser','custom')),
  target_amount numeric,
  current_amount numeric NOT NULL DEFAULT 0,
  contribution_amount numeric,
  frequency text CHECK (frequency IN ('weekly','bi-weekly','monthly','one-time')),
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  max_members integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by authenticated users" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update events" ON public.events FOR UPDATE USING (auth.uid() = creator_id);

-- Event members/contributions
CREATE TABLE public.event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  amount_contributed numeric NOT NULL DEFAULT 0,
  payout_position integer,
  has_received_payout boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view event members" ON public.event_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join events" ON public.event_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own membership" ON public.event_members FOR UPDATE USING (auth.uid() = user_id);

-- Meetings table
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  meeting_link text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  ai_notes text,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings viewable by authenticated" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update meetings" ON public.meetings FOR UPDATE USING (auth.uid() = organizer_id);

-- Meeting attendees
CREATE TABLE public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees viewable by authenticated" ON public.meeting_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join meetings" ON public.meeting_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Reminders table
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  reminder_type text NOT NULL DEFAULT 'contribution' CHECK (reminder_type IN ('contribution','loan_payment','meeting','event','custom')),
  due_date timestamptz NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert reminders" ON public.reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
