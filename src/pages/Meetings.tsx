import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Video, Clock, Users, Plus, Brain, FileText, ExternalLink, CalendarDays, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const statusColors: Record<string, string> = {
  scheduled: "bg-accent/20 text-accent-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type MeetingRecord = Database["public"]["Tables"]["meetings"]["Row"] & {
  meeting_attendees?: { count: number }[];
};

const generateJitsiLink = (title: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "vestivo-meeting";
  return `https://meet.jit.si/${slug}-${Math.random().toString(36).slice(2, 8)}`;
};

const parseLocalMeetingTime = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return null;

  return date;
};

export default function Meetings() {
  const { user, loading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotes, setShowNotes] = useState<MeetingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [rsvpMap, setRsvpMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("upcoming");

  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_link: "",
    scheduled_at: "",
    duration_minutes: "60",
  });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const [meetingsRes, attendeesRes] = await Promise.all([
      supabase
        .from("meetings")
        .select("*, meeting_attendees(count)")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("meeting_attendees")
        .select("meeting_id")
        .eq("user_id", user!.id),
    ]);

    if (meetingsRes.error) {
      toast.error("Failed to load meetings");
      setLoading(false);
      return;
    }
    if (attendeesRes.error) {
      toast.error("Failed to load your meeting RSVPs");
      setLoading(false);
      return;
    }

    setMeetings(meetingsRes.data || []);
    setRsvpMap(Object.fromEntries((attendeesRes.data || []).map(({ meeting_id }) => [meeting_id, true])));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) void fetchMeetings();
    else setLoading(false);
  }, [user, authLoading, fetchMeetings]);

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) {
      toast.error("Please fill in title and date");
      return;
    }

    const dateValue = parseLocalMeetingTime(form.scheduled_at);
    if (!dateValue || dateValue <= new Date()) {
      toast.error("Meeting date must be in the future");
      return;
    }

    const duration = Number(form.duration_minutes);
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
      toast.error("Meeting duration must be between 15 minutes and 8 hours");
      return;
    }

    let safeLink = generateJitsiLink(form.title);
    if (form.meeting_link.trim()) {
      try {
        const customLink = new URL(form.meeting_link.trim());
        if (customLink.protocol !== "https:" && customLink.protocol !== "http:") {
          toast.error("Meeting link must start with http:// or https://");
          return;
        }
        safeLink = customLink.toString();
      } catch {
        toast.error("Enter a valid meeting link");
        return;
      }
    }

    const { error } = await supabase.from("meetings").insert({
      organizer_id: user!.id,
      title: form.title,
      description: form.description,
      meeting_link: safeLink,
      scheduled_at: dateValue.toISOString(),
      duration_minutes: duration,
      status: "scheduled",
    });

    if (error) {
      toast.error("Failed to create meeting");
      return;
    }

    toast.success("Meeting scheduled with live room link!");
    setShowCreate(false);
    setForm({ title: "", description: "", meeting_link: "", scheduled_at: "", duration_minutes: "60" });
    void fetchMeetings();
  };

  const handleJoin = async (meetingId: string) => {
    const { error } = await supabase.from("meeting_attendees").insert({
      meeting_id: meetingId,
      user_id: user!.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Already joined");
      } else {
        toast.error("Failed to join");
      }
      return;
    }

    setRsvpMap((prev) => ({ ...prev, [meetingId]: true }));
    toast.success("Joined meeting!");
    void fetchMeetings();
  };

  const generateAINotes = async (meeting: MeetingRecord) => {
    setGeneratingNotes(true);
    try {
      const response = await supabase.functions.invoke("generate-meeting-notes", {
        body: { meetingId: meeting.id, title: meeting.title, description: meeting.description },
      });
      if (response.error) throw response.error;
      toast.success("AI notes generated!");
      void fetchMeetings();
    } catch (error) {
      console.error("Failed to generate meeting notes", error);
      toast.error("AI notes could not be generated. Please try again later.");
    } finally {
      setGeneratingNotes(false);
    }
  };

  const now = Date.now();
  const upcomingMeetings = meetings.filter(
    (meeting) => new Date(meeting.scheduled_at).getTime() >= now && meeting.status !== "cancelled",
  );
  const pastMeetings = meetings.filter(
    (meeting) => new Date(meeting.scheduled_at).getTime() < now || meeting.status === "cancelled",
  );
  const meetingsForTab = (tab: string) => tab === "upcoming"
    ? upcomingMeetings
    : tab === "past"
      ? [...pastMeetings].reverse()
      : meetings;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-6xl text-center text-muted-foreground">Loading meetings...</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-3xl">
          <Card className="p-8 text-center">
            <Video className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="page-title mb-2">Sign in to manage meetings</h1>
            <p className="page-description mb-5">Schedule chama meetings, RSVP, and access meeting notes.</p>
            <Button asChild><a href="/auth">Sign in</a></Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-6xl">
        <motion.div {...fadeIn} className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="page-title">Meetings</h1>
            <p className="page-description">Schedule meetings, join calls instantly, and get AI-powered notes</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
          </Button>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastMeetings.length})</TabsTrigger>
            <TabsTrigger value="all">All ({meetings.length})</TabsTrigger>
          </TabsList>
          {["upcoming", "past", "all"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {meetingsForTab(tab).length === 0 ? (
                <Card className="p-12 text-center border border-border">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {tab === "past" ? "No past meetings" : "No meetings scheduled"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {tab === "past" ? "Completed and cancelled meetings will appear here." : "Schedule your first chama meeting."}
                  </p>
                  {tab !== "past" && <Button onClick={() => setShowCreate(true)}>Schedule Meeting</Button>}
                </Card>
              ) : meetingsForTab(tab).map((meeting) => {
              const attendeeCount = meeting.meeting_attendees?.[0]?.count || 0;
              const isUpcoming = new Date(meeting.scheduled_at) > new Date();
              const rsvp = rsvpMap[meeting.id] || false;

              return (
                <motion.div key={meeting.id} {...fadeIn}>
                  <Card className="p-5 border border-border shadow-card">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Video className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display font-semibold text-foreground">{meeting.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {format(new Date(meeting.scheduled_at), "MMM d, yyyy · h:mm a")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {meeting.duration_minutes}min
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {attendeeCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground ml-[52px] line-clamp-2">{meeting.description}</p>
                        )}
                        {meeting.ai_summary && (
                          <div className="ml-[52px] mt-2 bg-muted rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                              <Brain className="w-3 h-3" /> AI Summary
                            </p>
                            <p className="text-sm text-foreground">{meeting.ai_summary}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-[52px] lg:ml-0 flex-wrap">
                        <Badge variant="secondary" className={statusColors[meeting.status] || ""}>
                          {meeting.status.replace("_", " ")}
                        </Badge>
                        {rsvp && (
                          <Badge className="bg-primary/10 text-primary">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> RSVP confirmed
                          </Badge>
                        )}
                        {isUpcoming && meeting.status !== "cancelled" && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => handleJoin(meeting.id)} disabled={rsvp}>
                              {rsvp ? "RSVP confirmed" : "RSVP"}
                            </Button>
                            <Button size="sm" variant="default" asChild>
                              <a href={meeting.meeting_link || generateJitsiLink(meeting.title)} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" /> Open Call
                              </a>
                            </Button>
                          </>
                        )}
                        {!meeting.ai_notes && meeting.status !== "cancelled" && (
                          <Button size="sm" variant="secondary" onClick={() => generateAINotes(meeting)} disabled={generatingNotes}>
                            <Brain className="w-4 h-4 mr-1" />
                            {generatingNotes ? "Generating..." : "AI Notes"}
                          </Button>
                        )}
                        {meeting.ai_notes && (
                          <Button size="sm" variant="ghost" onClick={() => setShowNotes(meeting)}>
                            <FileText className="w-4 h-4 mr-1" /> View Notes
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>Set up a virtual meeting for your chama. If no link is provided, Vestivo will generate a Jitsi room automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Meeting Title *</Label>
              <Input placeholder="e.g., Monthly Review" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Meeting agenda..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input placeholder="Leave blank for auto-generated Jitsi link" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time *</Label>
                <Input type="datetime-local" step={60} value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showNotes} onOpenChange={() => setShowNotes(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Meeting Notes: {showNotes?.title}
            </DialogTitle>
            <DialogDescription>
              {showNotes && format(new Date(showNotes.scheduled_at), "MMMM d, yyyy · h:mm a")}
            </DialogDescription>
          </DialogHeader>
          {showNotes?.ai_notes && (
            <div className="prose prose-sm max-w-none text-foreground">
              {showNotes.ai_notes.split("\n").map((line: string, i: number) => {
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-display font-bold text-foreground mt-4 mb-2">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-display font-semibold text-foreground mt-3 mb-1">{line.replace("### ", "")}</h3>;
                if (line.startsWith("- ")) return <li key={i} className="text-sm text-muted-foreground ml-4">{line.replace("- ", "")}</li>;
                if (line.match(/^\d+\./)) return <li key={i} className="text-sm text-muted-foreground ml-4 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
                if (line.trim()) return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
                return null;
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




































