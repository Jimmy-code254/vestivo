import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { CalendarDays, Users, Banknote, Plus, RefreshCw, Landmark, Heart, Sparkles, Copy, TicketPercent, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const eventTypeConfig: Record<string, { label: string; icon: typeof RefreshCw; color: string }> = {
  merry_go_round: { label: "Merry-Go-Round", icon: RefreshCw, color: "bg-primary/10 text-primary" },
  table_banking: { label: "Table Banking", icon: Landmark, color: "bg-accent/20 text-accent-foreground" },
  fundraiser: { label: "Fundraiser", icon: Heart, color: "bg-destructive/10 text-destructive" },
  custom: { label: "Custom", icon: Sparkles, color: "bg-secondary text-secondary-foreground" },
};

const generateInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

type EventRecord = Database["public"]["Tables"]["events"]["Row"] & {
  event_members?: { count: number }[];
};

export default function Events() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "merry_go_round",
    target_amount: "",
    contribution_amount: "",
    frequency: "monthly",
    max_members: "",
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const [eventsRes, membershipsRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, event_members(count)")
        .order("created_at", { ascending: false }),
      supabase
        .from("event_members")
        .select("event_id")
        .eq("user_id", user!.id),
    ]);

    if (eventsRes.error) {
      toast.error("Failed to load events");
      setLoading(false);
      return;
    }
    if (membershipsRes.error) {
      toast.error("Failed to load your event memberships");
      setLoading(false);
      return;
    }

    setEvents(eventsRes.data || []);
    setMyEventIds((membershipsRes.data || []).map((membership) => membership.event_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) void fetchEvents();
    else setLoading(false);
  }, [user, authLoading, fetchEvents]);

  const handleCreate = async () => {
    if (!user) {
      toast.error("Sign in to create an event");
      return;
    }
    if (!form.title || !form.contribution_amount) {
      toast.error("Please fill in required fields");
      return;
    }

    const inviteCode = generateInviteCode();

    const { error } = await supabase.from("events").insert({
      creator_id: user!.id,
      title: form.title,
      description: form.description,
      event_type: form.event_type,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      contribution_amount: Number(form.contribution_amount),
      frequency: form.frequency,
      max_members: form.max_members ? Number(form.max_members) : null,
      invite_code: inviteCode,
    });

    if (error) {
      toast.error("Failed to create event");
      return;
    }

    toast.success("Event created! Invite code: " + inviteCode);
    setShowCreate(false);
    setForm({ title: "", description: "", event_type: "merry_go_round", target_amount: "", contribution_amount: "", frequency: "monthly", max_members: "" });
    void fetchEvents();
  };

  const handleJoin = async (eventId: string) => {
    if (!user) {
      toast.error("Sign in to join an event");
      return false;
    }

    const { error } = await supabase.from("event_members").insert({
      event_id: eventId,
      user_id: user.id,
    });

    if (error && error.code !== "23505") {
      console.error("Failed to join event", error);
      toast.error("Failed to join this event");
      return false;
    }

    setMyEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
    toast.success(error?.code === "23505" ? "You already joined this event" : "Joined event!");
    void fetchEvents();
    return true;
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter an invite code");
      return;
    }

    const match = events.find((event) => event.invite_code === code);
    if (!match) {
      toast.error("Invite code not found");
      return;
    }

    const joined = await handleJoin(match.id);
    if (joined) {
      setShowJoinCode(false);
      setJoinCode("");
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-6xl text-center text-muted-foreground">Loading events...</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-3xl">
          <Card className="p-8 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="page-title mb-2">Sign in to manage events</h1>
            <p className="page-description mb-5">Join contribution events or create one for your community.</p>
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
            <h1 className="page-title">Events & Contributions</h1>
            <p className="page-description">Merry-go-round, table banking, fundraisers, and invite-based joining</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setShowJoinCode(true)}>
              <TicketPercent className="w-4 h-4 mr-2" /> Join with Code
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Event
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="my-events">My Events</TabsTrigger>
            <TabsTrigger value="merry_go_round">Merry-Go-Round</TabsTrigger>
            <TabsTrigger value="table_banking">Table Banking</TabsTrigger>
            <TabsTrigger value="fundraiser">Fundraisers</TabsTrigger>
          </TabsList>

          {[
            { key: "all", label: "all" },
            { key: "my-events", label: "my-events" },
            { key: "merry_go_round", label: "merry_go_round" },
            { key: "table_banking", label: "table_banking" },
            { key: "fundraiser", label: "fundraiser" },
          ].map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events
                    .filter((event) => {
                      if (tab.key === "my-events") return myEventIds.includes(event.id);
                      if (tab.key === "all") return true;
                      return event.event_type === tab.key;
                    })
                    .map((event) => {
                      const config = eventTypeConfig[event.event_type] || eventTypeConfig.custom;
                      const TypeIcon = config.icon;
                      const progress = event.target_amount ? (event.current_amount / event.target_amount) * 100 : 0;
                      const memberCount = event.event_members?.[0]?.count || 0;

                      return (
                        <motion.div key={event.id} {...fadeIn}>
                          <Card className="p-5 border border-border shadow-card h-full flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <Badge variant="secondary" className={config.color}>
                                {config.label}
                              </Badge>
                            </div>

                            <div className="mb-3 flex items-center justify-between gap-2">
                              <h3 className="font-display font-semibold text-foreground mb-0">{event.title}</h3>
                              {myEventIds.includes(event.id) && (
                                <Badge className="bg-primary/10 text-primary">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Joined
                                </Badge>
                              )}
                            </div>

                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                            )}

                            <div className="space-y-2 mt-auto">
                              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2 py-2">
                                <span className="text-xs text-muted-foreground">Invite code</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-semibold text-foreground">{event.invite_code}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyInviteCode(event.invite_code)}
                                    className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
                                    aria-label="Copy invite code"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Banknote className="w-3 h-3" /> Contribution
                                </span>
                                <span className="font-medium text-foreground">
                                  KES {Number(event.contribution_amount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3" /> Members
                                </span>
                                <span className="font-medium text-foreground">
                                  {memberCount}{event.max_members ? `/${event.max_members}` : ""}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" /> Frequency
                                </span>
                                <span className="font-medium text-foreground capitalize">{event.frequency || "One-time"}</span>
                              </div>
                              {event.target_amount && (
                                <div>
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>KES {Number(event.current_amount).toLocaleString()}</span>
                                    <span>KES {Number(event.target_amount).toLocaleString()}</span>
                                  </div>
                                  <Progress value={progress} className="h-2 bg-muted [&>div]:bg-primary" />
                                </div>
                              )}
                              <Button
                                variant={myEventIds.includes(event.id) ? "secondary" : "default"}
                                className="w-full mt-2"
                                size="sm"
                                onClick={() => handleJoin(event.id)}
                              >
                                {myEventIds.includes(event.id) ? "Joined" : "Join Event"}
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}

                  {events.filter((event) => {
                    if (tab.key === "my-events") return myEventIds.includes(event.id);
                    if (tab.key === "all") return true;
                    return event.event_type === tab.key;
                  }).length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-display font-semibold text-foreground mb-2">No events yet</h3>
                      <p className="text-muted-foreground mb-4">Create the first event for your community</p>
                      <Button onClick={() => setShowCreate(true)}>Create Event</Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showJoinCode} onOpenChange={setShowJoinCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join with invite code</DialogTitle>
            <DialogDescription>Enter a 6-character code to join an event instantly</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Invite Code</Label>
              <Input
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowJoinCode(false)}>Cancel</Button>
            <Button onClick={handleJoinByCode}>Verify & Join</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Set up a contribution event for your community</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Event Name *</Label>
              <Input placeholder="e.g., Monthly Merry-Go-Round" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Describe the event..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merry_go_round">Merry-Go-Round</SelectItem>
                    <SelectItem value="table_banking">Table Banking</SelectItem>
                    <SelectItem value="fundraiser">Fundraiser</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one-time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contribution Amount (KES) *</Label>
                <Input type="number" placeholder="5,000" value={form.contribution_amount} onChange={(e) => setForm({ ...form, contribution_amount: e.target.value })} />
              </div>
              <div>
                <Label>Target Amount (KES)</Label>
                <Input type="number" placeholder="Optional" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Max Members</Label>
              <Input type="number" placeholder="Optional" value={form.max_members} onChange={(e) => setForm({ ...form, max_members: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
