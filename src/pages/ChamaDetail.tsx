import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Users,
  Crown,
  Copy,
  Settings,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Wallet,
  CheckCircle2,
  Shuffle,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import ContributionsTracker from "@/components/ContributionsTracker";
import ChamaChat from "@/components/ChamaChat";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

type ChamaData = {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  contribution_amount: number;
  frequency: string;
  max_members: number;
  invite_code: string;
  current_round: number;
  total_rounds: number;
  status: string;
  created_at: string;
};

type MemberData = {
  id: string;
  user_id: string;
  role: string;
  payout_position: number | null;
  total_contributed: number;
  status: string;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
};

function memberInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ChamaDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chama, setChama] = useState<ChamaData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [randomizing, setRandomizing] = useState(false);

  const fetchChama = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data: chamaData, error: chamaError } = await supabase.from("chamas").select("*").eq("id", id).single();
    if (chamaError || !chamaData) {
      toast.error("Failed to load this chama");
      navigate("/dashboard");
      setLoading(false);
      return;
    }
    setChama(chamaData);
    setIsCreator(chamaData.creator_id === user.id);
    setEditName(chamaData.name);
    setEditDesc(chamaData.description || "");

    // Fetch members with profiles
    const { data: membersData, error: membersError } = await supabase
      .from("chama_members")
      .select(`
        id, user_id, role, payout_position, total_contributed, status, joined_at,
        profile:profiles(display_name, avatar_url)
      `)
      .eq("chama_id", id)
      .eq("status", "active")
      .order("payout_position", { ascending: true });

    if (membersError) {
      toast.error("Failed to load chama members");
      setLoading(false);
      return;
    }
    setMembers((membersData || []).map((member) => ({
      ...member,
      profile: Array.isArray(member.profile) ? member.profile[0] ?? null : member.profile ?? null,
    })));
    setLoading(false);
  }, [id, navigate, user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    void fetchChama();
  }, [user, fetchChama, navigate]);

  const copyInviteCode = () => {
    if (chama) {
      navigator.clipboard.writeText(chama.invite_code);
      toast.success("Invite code copied!");
    }
  };

  const handleSaveSettings = async () => {
    if (!chama || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("chamas").update({ name: editName.trim(), description: editDesc.trim() || null }).eq("id", chama.id);
    if (error) { toast.error("Failed to update"); } else {
      toast.success("Chama updated!");
      setChama({ ...chama, name: editName.trim(), description: editDesc.trim() || null });
      setShowSettings(false);
    }
    setSaving(false);
  };

  // ── Rotation: Process Payout & Advance Round ─────────────────────────────
  const handleProcessPayout = async () => {
    if (!chama) return;
    setProcessingPayout(true);

    try {
      const { data: payoutAmount, error } = await supabase.rpc("process_chama_payout", {
        p_chama_id: chama.id,
        p_round_number: chama.current_round,
      });
      if (error) throw error;

      toast.success(`KES ${Number(payoutAmount).toLocaleString()} payout processed for Round ${chama.current_round}.`);
      await fetchChama();
    } catch (error) {
      console.error("Failed to process chama payout", error);
      toast.error(error instanceof Error ? error.message : "Payout failed. Please try again.");
    } finally {
      setProcessingPayout(false);
    }
  };

  // ── Rotation: Randomize Payout Order ────────────────────────────────────
  const handleRandomizeOrder = async () => {
    if (!chama) return;
    setRandomizing(true);

    try {
      const { data: memberCount, error } = await supabase.rpc("randomize_chama_payout_order", {
        p_chama_id: chama.id,
      });
      if (error) throw error;
      if (!memberCount) {
        toast.error("There are no active members to assign.");
        return;
      }

      toast.success("Payout order randomized!");
      await fetchChama();
    } catch (error) {
      console.error("Failed to randomize chama payout order", error);
      toast.error(error instanceof Error ? error.message : "Failed to randomize order.");
    } finally {
      setRandomizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="pt-24 text-center text-muted-foreground">Loading chama...</div>
      </div>
    );
  }

  if (!chama) return null;

  const progress = chama.total_rounds > 0 ? (chama.current_round / chama.total_rounds) * 100 : 0;
  const totalContributed = members.reduce((s, m) => s + Number(m.total_contributed), 0);

  // Rotation helpers
  const currentRecipient = members.find((m) => m.payout_position === chama.current_round);
  const isCompleted = chama.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-5xl">
        {/* Back */}
        <motion.div {...fadeIn}>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div {...fadeIn} className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">{chama.name}</h1>
              {chama.description && <p className="text-muted-foreground">{chama.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={
                chama.status === "active" ? "bg-primary/10 text-primary" :
                chama.status === "completed" ? "bg-muted text-muted-foreground" :
                "bg-destructive/10 text-destructive"
              }>
                {chama.status}
              </Badge>
              {isCreator && (
                <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Contribution", value: `KES ${Number(chama.contribution_amount).toLocaleString()}`, icon: Wallet },
            { label: "Frequency", value: chama.frequency, icon: Calendar },
            { label: "Members", value: `${members.length}/${chama.max_members}`, icon: Users },
            { label: "Total Collected", value: `KES ${totalContributed.toLocaleString()}`, icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label} className="p-4 border border-border shadow-card">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-2">
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-display font-bold text-card-foreground capitalize">{s.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Progress */}
        {chama.total_rounds > 0 && (
          <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="mb-8">
            <Card className="p-5 border border-border shadow-card">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display font-semibold text-foreground">Round Progress</h3>
                <span className="text-sm text-muted-foreground">Round {chama.current_round} of {chama.total_rounds}</span>
              </div>
              <Progress value={progress} className="h-3 bg-muted [&>div]:bg-primary" />
            </Card>
          </motion.div>
        )}

        {/* Invite Code */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="mb-8">
          <Card className="p-5 border border-border shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
                <p className="text-2xl font-display font-bold tracking-widest text-foreground">{chama.invite_code}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyInviteCode}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  className="bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white"
                  onClick={() => {
                    const msg = encodeURIComponent(`Join my chama "${chama.name}" on Vestivo! Use invite code: ${chama.invite_code}\n\nhttps://vestivo.app`);
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                  }}
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Tabs: Members & Payout / Contributions / Chat ─────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }}>
          <Tabs defaultValue="members">
            <TabsList className="mb-6">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="rotation">Rotation</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="chat">Group Chat</TabsTrigger>
            </TabsList>

            {/* ── Members Tab ─────────────────────────────────────────────── */}
            <TabsContent value="members">
              <Card className="border border-border shadow-card">
                <CardHeader>
                  <CardTitle className="font-display">Members & Payout Order</CardTitle>
                  <CardDescription>Members sorted by payout position</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {members.map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.payout_position != null && m.payout_position < chama.current_round ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {m.payout_position ?? idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              {m.profile?.display_name || "Member"}
                              {m.role === "admin" && <Crown className="w-3 h-3 text-accent" />}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Contributed: KES {Number(m.total_contributed).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.payout_position != null && m.payout_position < chama.current_round && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                          <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Rotation Tab ────────────────────────────────────────────── */}
            <TabsContent value="rotation">
              <div className="space-y-4">
                {/* Current recipient highlight */}
                {!isCompleted && currentRecipient && (
                  <motion.div {...fadeIn}>
                    <Card className="border-2 border-accent shadow-elevated bg-accent/5">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-lg font-bold text-accent">
                              {memberInitials(currentRecipient.profile?.display_name)}
                            </div>
                            <Crown className="w-4 h-4 text-accent absolute -top-1 -right-1" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                              Current Recipient — Round {chama.current_round}
                            </p>
                            <p className="text-lg font-display font-bold text-foreground">
                              {currentRecipient.profile?.display_name || "Member"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Payout amount: <span className="font-semibold text-accent">KES {(Number(chama.contribution_amount) * members.length).toLocaleString()}</span>
                            </p>
                          </div>
                          {isCreator && (
                            <Button
                              onClick={handleProcessPayout}
                              disabled={processingPayout}
                              className="gap-1.5"
                            >
                              <PlayCircle className="w-4 h-4" />
                              {processingPayout ? "Processing..." : "Process Payout & Advance Round"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {isCompleted && (
                  <motion.div {...fadeIn}>
                    <Card className="border border-border shadow-card bg-muted/30">
                      <CardContent className="pt-6 pb-6 text-center">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-2" />
                        <p className="font-display font-semibold text-foreground">All rounds completed!</p>
                        <p className="text-sm text-muted-foreground mt-1">Every member has received their payout.</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Randomize button (creator only) */}
                {isCreator && !isCompleted && (
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Shuffle className="w-4 h-4" />
                          Randomize Payout Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Randomize Payout Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will shuffle all members' payout positions randomly. This action cannot be undone and will affect the current round immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRandomizeOrder}
                            disabled={randomizing}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            {randomizing ? "Randomizing..." : "Randomize"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* Full rotation list */}
                <Card className="border border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display">Rotation Order</CardTitle>
                    <CardDescription>Full payout sequence for this cycle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {members
                        .slice()
                        .sort((a, b) => (a.payout_position ?? 0) - (b.payout_position ?? 0))
                        .map((m) => {
                          const pos = m.payout_position ?? 0;
                          const isCurrent = pos === chama.current_round;
                          const isDone = pos < chama.current_round;
                          const isUpcoming = pos > chama.current_round;

                          return (
                            <motion.div
                              key={m.id}
                              {...fadeIn}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                isCurrent
                                  ? "border-accent bg-accent/5"
                                  : isDone
                                  ? "border-border bg-muted/30"
                                  : "border-border bg-card"
                              }`}
                            >
                              {/* Position badge */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  isCurrent
                                    ? "bg-accent text-accent-foreground"
                                    : isDone
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {pos}
                              </div>

                              {/* Avatar initials */}
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                                  isCurrent
                                    ? "bg-accent/20 text-accent"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {memberInitials(m.profile?.display_name)}
                              </div>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                                  {m.profile?.display_name || "Member"}
                                  {isCurrent && <Crown className="w-3 h-3 text-accent flex-shrink-0" />}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Contributed: KES {Number(m.total_contributed).toLocaleString()}
                                </p>
                              </div>

                              {/* Status badge */}
                              {isDone && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </Badge>
                              )}
                              {isCurrent && (
                                <Badge className="bg-accent/20 text-accent flex items-center gap-1 text-[10px]">
                                  <RotateCcw className="w-3 h-3" /> Current
                                </Badge>
                              )}
                              {isUpcoming && (
                                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                  Upcoming
                                </Badge>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Contributions Tab ────────────────────────────────────── */}
            <TabsContent value="contributions">
              <ContributionsTracker
                chamaId={chama.id}
                currentRound={chama.current_round}
                contributionAmount={Number(chama.contribution_amount)}
                members={members.map((m) => ({
                  user_id: m.user_id,
                  display_name: m.profile?.display_name || null,
                  total_contributed: m.total_contributed,
                }))}
                isCreator={isCreator}
              />
            </TabsContent>

            {/* ── Chat Tab ────────────────────────────────────────────── */}
            <TabsContent value="chat">
              <ChamaChat
                chamaId={chama.id}
                members={members.map((m) => ({
                  user_id: m.user_id,
                  display_name: m.profile?.display_name || null,
                }))}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Footer />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Chama Settings</DialogTitle>
            <DialogDescription>Update your chama details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
