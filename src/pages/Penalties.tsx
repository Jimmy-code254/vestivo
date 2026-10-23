import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Banknote,
  XCircle,
  ShieldX,
} from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PenaltyType = "late_payment" | "missed_meeting" | "misconduct" | "custom";
type PenaltyStatus = "unpaid" | "paid" | "waived";

interface Penalty {
  id: string;
  chama_id: string;
  user_id: string;
  issued_by: string;
  reason: string;
  amount: number;
  penalty_type: PenaltyType;
  status: PenaltyStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  chama_name?: string;
}

interface Chama {
  id: string;
  name: string;
}

interface ChamaMember {
  id: string;
  user_id: string;
  display_name: string;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

const typeConfig: Record<PenaltyType, { label: string; color: string }> = {
  late_payment: { label: "Late Payment", color: "bg-amber-100 text-amber-700" },
  missed_meeting: { label: "Missed Meeting", color: "bg-orange-100 text-orange-700" },
  misconduct: { label: "Misconduct", color: "bg-destructive/10 text-destructive" },
  custom: { label: "Custom", color: "bg-muted text-muted-foreground" },
};

const statusConfig: Record<
  PenaltyStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  unpaid: { label: "Unpaid", color: "bg-destructive/10 text-destructive", icon: XCircle },
  paid: { label: "Paid", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  waived: { label: "Waived", color: "bg-muted text-muted-foreground", icon: ShieldX },
};

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function PenaltySkeleton() {
  return (
    <Card className="p-5 border border-border">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24 self-start" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Penalties() {
  const { user } = useAuth();

  // My fines state
  const [myPenalties, setMyPenalties] = useState<Penalty[]>([]);
  const [loadingFines, setLoadingFines] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Creator state
  const [myChamas, setMyChamas] = useState<Chama[]>([]);
  const [chamaMembers, setChamaMembers] = useState<ChamaMember[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Issue-fine form
  const [form, setForm] = useState({
    chama_id: "",
    member_user_id: "",
    penalty_type: "late_payment" as PenaltyType,
    amount: "",
    reason: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchMyPenalties();
      fetchCreatorChamas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When the selected chama changes, load its members
  useEffect(() => {
    if (form.chama_id) fetchChamaMembers(form.chama_id);
    else setChamaMembers([]);
    setForm((prev) => ({ ...prev, member_user_id: "" }));
  }, [form.chama_id]);

  // ---------------------------------------------------------------------------
  // Data fetchers
  // ---------------------------------------------------------------------------

  const fetchMyPenalties = async () => {
    setLoadingFines(true);
    const { data, error } = await supabase
      .from("penalties")
      .select("*, chamas(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load fines");
    } else if (data) {
      const mapped: Penalty[] = data.map((row) => ({
        ...row,
        amount: Number(row.amount),
        penalty_type: row.penalty_type as PenaltyType,
        status: row.status as PenaltyStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chama_name: (row as any).chamas?.name ?? "Unknown Chama",
      }));
      setMyPenalties(mapped);
    }
    setLoadingFines(false);
  };

  const fetchCreatorChamas = async () => {
    const { data } = await supabase
      .from("chamas")
      .select("id, name")
      .eq("creator_id", user!.id)
      .order("name");
    if (data && data.length > 0) {
      setMyChamas(data);
      setIsCreator(true);
    }
  };

  const fetchChamaMembers = async (chamaId: string) => {
    const { data } = await supabase
      .from("chama_members")
      .select("id, user_id, profiles(display_name)")
      .eq("chama_id", chamaId)
      .eq("status", "active");

    if (data) {
      const members: ChamaMember[] = data.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        display_name: (m as any).profiles?.display_name ?? m.user_id,
      }));
      setChamaMembers(members);
    }
  };

  // ---------------------------------------------------------------------------
  // Pay fine
  // ---------------------------------------------------------------------------

  const handlePayFine = async (penalty: Penalty) => {
    setPayingId(penalty.id);
    try {
      const { error } = await supabase.rpc("pay_penalty_from_wallet", {
        p_penalty_id: penalty.id,
      });
      if (error) throw error;

      toast.success(`Fine of KES ${penalty.amount.toLocaleString()} paid successfully!`);
      await fetchMyPenalties();
    } catch (error) {
      console.error("Failed to pay penalty from wallet", error);
      toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.");
    } finally {
      setPayingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Issue fine
  // ---------------------------------------------------------------------------

  const handleIssueFine = async () => {
    const { chama_id, member_user_id, penalty_type, amount, reason, due_date, notes } = form;

    if (!chama_id || !member_user_id || !amount || !reason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("penalties").insert({
        chama_id,
        user_id: member_user_id,
        issued_by: user!.id,
        reason,
        amount: parsedAmount,
        penalty_type,
        status: "unpaid",
        due_date: due_date ? new Date(due_date).toISOString() : null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Fine issued successfully!");
      setForm({
        chama_id: "",
        member_user_id: "",
        penalty_type: "late_payment",
        amount: "",
        reason: "",
        due_date: "",
        notes: "",
      });
    } catch {
      toast.error("Failed to issue fine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------

  const totalOutstanding = myPenalties
    .filter((p) => p.status === "unpaid")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPaidCount = myPenalties.filter((p) => p.status === "paid").length;

  const chamasWithActiveFines = new Set(
    myPenalties.filter((p) => p.status === "unpaid").map((p) => p.chama_id)
  ).size;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Sign in to view your fines & penalties.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-4xl">
        {/* Header */}
        <motion.div {...fadeIn} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h1 className="page-title">
              Fines &amp; Penalties
            </h1>
          </div>
          <p className="text-muted-foreground ml-13 pl-1">
            Manage your outstanding fines and issue penalties to chama members.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            {
              label: "Outstanding",
              value: `KES ${totalOutstanding.toLocaleString()}`,
              icon: Clock,
              color: "bg-destructive/10 text-destructive",
            },
            {
              label: "Paid Fines",
              value: String(totalPaidCount),
              icon: CheckCircle2,
              color: "bg-primary/10 text-primary",
            },
            {
              label: "Chamas with Fines",
              value: String(chamasWithActiveFines),
              icon: Users,
              color: "bg-muted text-muted-foreground",
            },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 border border-border shadow-card">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-display font-bold text-card-foreground">{stat.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Tabs defaultValue="my-fines" className="space-y-6">
            <TabsList>
              <TabsTrigger value="my-fines">
                My Fines{" "}
                {myPenalties.filter((p) => p.status === "unpaid").length > 0 && (
                  <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                    {myPenalties.filter((p) => p.status === "unpaid").length}
                  </span>
                )}
              </TabsTrigger>
              {isCreator && (
                <TabsTrigger value="issue-fine">Issue Fine</TabsTrigger>
              )}
            </TabsList>

            {/* ----------------------------------------------------------------
                My Fines tab
            ---------------------------------------------------------------- */}
            <TabsContent value="my-fines" className="space-y-4">
              {loadingFines ? (
                <>
                  <PenaltySkeleton />
                  <PenaltySkeleton />
                </>
              ) : myPenalties.length === 0 ? (
                <Card className="p-12 text-center border border-border">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    No fines — great work! 🎉
                  </h3>
                  <p className="text-muted-foreground">
                    You have no penalties on record. Keep it up!
                  </p>
                </Card>
              ) : (
                myPenalties.map((penalty) => {
                  const typeConf = typeConfig[penalty.penalty_type] ?? typeConfig.custom;
                  const statusConf = statusConfig[penalty.status] ?? statusConfig.unpaid;
                  const StatusIcon = statusConf.icon;
                  const isUnpaid = penalty.status === "unpaid";
                  const isPaying = payingId === penalty.id;

                  return (
                    <motion.div key={penalty.id} {...fadeIn}>
                      <Card
                        className={`p-5 border shadow-card ${
                          isUnpaid ? "border-destructive/30" : "border-border"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 space-y-1.5">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge
                                variant="secondary"
                                className={`${typeConf.color} text-xs`}
                              >
                                {typeConf.label}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={`${statusConf.color} gap-1 text-xs`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConf.label}
                              </Badge>
                            </div>

                            {/* Amount */}
                            <p className="text-xl font-display font-bold text-foreground">
                              KES {penalty.amount.toLocaleString()}
                            </p>

                            {/* Reason */}
                            <p className="text-sm text-muted-foreground">{penalty.reason}</p>

                            {/* Chama */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{penalty.chama_name}</span>
                            </div>

                            {/* Due date */}
                            {penalty.due_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Due{" "}
                                  {format(new Date(penalty.due_date), "MMM d, yyyy")}
                                  {isUnpaid &&
                                    new Date(penalty.due_date) < new Date() && (
                                      <span className="text-destructive font-medium ml-1">
                                        · Overdue
                                      </span>
                                    )}
                                </span>
                              </div>
                            )}

                            {/* Paid at */}
                            {penalty.paid_at && (
                              <p className="text-xs text-primary">
                                Paid on {format(new Date(penalty.paid_at), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>

                          {/* Action */}
                          {isUnpaid && (
                            <Button
                              size="sm"
                              className="shrink-0"
                              onClick={() => handlePayFine(penalty)}
                              disabled={isPaying}
                            >
                              <Banknote className="w-4 h-4 mr-1.5" />
                              {isPaying ? "Processing…" : "Pay Fine"}
                            </Button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </TabsContent>

            {/* ----------------------------------------------------------------
                Issue Fine tab (creator only)
            ---------------------------------------------------------------- */}
            {isCreator && (
              <TabsContent value="issue-fine">
                <Card className="p-6 border border-border shadow-card">
                  <h2 className="font-display font-semibold text-foreground mb-5">
                    Issue a New Fine
                  </h2>
                  <div className="space-y-5">
                    {/* Chama select */}
                    <div className="space-y-1.5">
                      <Label>Chama *</Label>
                      <Select
                        value={form.chama_id}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, chama_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a chama" />
                        </SelectTrigger>
                        <SelectContent>
                          {myChamas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Member select */}
                    <div className="space-y-1.5">
                      <Label>Member *</Label>
                      <Select
                        value={form.member_user_id}
                        onValueChange={(v) =>
                          setForm((prev) => ({ ...prev, member_user_id: v }))
                        }
                        disabled={!form.chama_id}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              form.chama_id
                                ? chamaMembers.length === 0
                                  ? "No active members"
                                  : "Select a member"
                                : "Select a chama first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {chamaMembers.map((m) => (
                            <SelectItem key={m.id} value={m.user_id}>
                              {m.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Penalty type */}
                      <div className="space-y-1.5">
                        <Label>Penalty Type *</Label>
                        <Select
                          value={form.penalty_type}
                          onValueChange={(v) =>
                            setForm((prev) => ({ ...prev, penalty_type: v as PenaltyType }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="late_payment">Late Payment</SelectItem>
                            <SelectItem value="missed_meeting">Missed Meeting</SelectItem>
                            <SelectItem value="misconduct">Misconduct</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount */}
                      <div className="space-y-1.5">
                        <Label>Amount (KES) *</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g. 500"
                          value={form.amount}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                      <Label>Reason *</Label>
                      <Textarea
                        placeholder="Briefly explain the reason for this fine…"
                        value={form.reason}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, reason: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>

                    {/* Due date */}
                    <div className="space-y-1.5">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, due_date: e.target.value }))
                        }
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Any additional notes for this penalty…"
                        value={form.notes}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>

                    <Button
                      className="w-full sm:w-auto"
                      onClick={handleIssueFine}
                      disabled={submitting}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {submitting ? "Issuing…" : "Issue Fine"}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
