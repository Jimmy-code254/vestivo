import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Bell, Plus, Check, Trash2, Banknote, CalendarDays, Video, Sparkles, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  contribution: { icon: Banknote, color: "bg-primary/10 text-primary" },
  loan_payment: { icon: Banknote, color: "bg-accent/20 text-accent-foreground" },
  meeting: { icon: Video, color: "bg-secondary text-secondary-foreground" },
  event: { icon: CalendarDays, color: "bg-destructive/10 text-destructive" },
  custom: { icon: Sparkles, color: "bg-muted text-muted-foreground" },
};

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState({
    title: "",
    message: "",
    reminder_type: "contribution",
    due_date: "",
  });

  useEffect(() => {
    if (user) fetchReminders();
  }, [user]);

  const fetchReminders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .order("due_date", { ascending: true });
    if (data) setReminders(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.due_date) {
      toast.error("Please fill in title and due date");
      return;
    }
    const { error } = await supabase.from("reminders").insert({
      user_id: user!.id,
      title: form.title,
      message: form.message || null,
      reminder_type: form.reminder_type,
      due_date: new Date(form.due_date).toISOString(),
    });
    if (error) {
      toast.error("Failed to create reminder");
      return;
    }
    toast.success("Reminder set!");
    setShowCreate(false);
    setForm({ title: "", message: "", reminder_type: "contribution", due_date: "" });
    fetchReminders();
  };

  const markRead = async (id: string) => {
    await supabase.from("reminders").update({ is_read: true }).eq("id", id);
    fetchReminders();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    toast.success("Reminder deleted");
    fetchReminders();
  };

  const syncContributionReminders = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("contribution-reminders");
      if (error) throw error;
      toast.success(`Synced! ${data?.reminders_created || 0} new reminders created`);
      fetchReminders();
    } catch {
      toast.error("Failed to sync reminders");
    }
    setSyncing(false);
  };

  const unread = reminders.filter((r) => !r.is_read);
  const read = reminders.filter((r) => r.is_read);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-4xl">
        <motion.div {...fadeIn} className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="page-title">Reminders</h1>
            <p className="page-description">
              {unread.length > 0 ? `${unread.length} pending reminder${unread.length > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncContributionReminders} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sync Contributions
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Reminder
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : reminders.length === 0 ? (
          <Card className="p-12 text-center border border-border">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-semibold text-foreground mb-2">No reminders</h3>
            <p className="text-muted-foreground mb-4">Set reminders for contributions, meetings, and more</p>
            <Button onClick={() => setShowCreate(true)}>Create Reminder</Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {unread.length > 0 && (
              <div>
                <h2 className="font-display font-semibold text-foreground mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {unread.map((reminder) => {
                    const config = typeConfig[reminder.reminder_type] || typeConfig.custom;
                    const TypeIcon = config.icon;
                    const isOverdue = new Date(reminder.due_date) < new Date();
                    return (
                      <motion.div key={reminder.id} {...fadeIn}>
                        <Card className={`p-4 border shadow-card ${isOverdue ? "border-destructive/30" : "border-border"}`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{reminder.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(reminder.due_date), "MMM d, yyyy · h:mm a")}
                                  {isOverdue && <span className="text-destructive ml-2 font-medium">Overdue</span>}
                                </p>
                                {reminder.message && <p className="text-sm text-muted-foreground mt-1">{reminder.message}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => markRead(reminder.id)} title="Mark done">
                                <Check className="w-4 h-4 text-primary" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteReminder(reminder.id)} title="Delete">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {read.length > 0 && (
              <div>
                <h2 className="font-display font-semibold text-muted-foreground mb-3">Completed</h2>
                <div className="space-y-2">
                  {read.map((reminder) => (
                    <Card key={reminder.id} className="p-3 border border-border opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground line-through">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(reminder.due_date), "MMM d, yyyy")}</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => deleteReminder(reminder.id)}>
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Reminder Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
            <DialogDescription>Set a reminder for yourself</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input placeholder="e.g., Pay monthly contribution" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Input placeholder="Optional details" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contribution">Contribution</SelectItem>
                    <SelectItem value="loan_payment">Loan Payment</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Set Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
