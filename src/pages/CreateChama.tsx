import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Users, Wallet, Calendar, ArrowRight, Shield, Copy, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function CreateChama() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contribution: "",
    members: "",
    frequency: "",
    description: "",
  });
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.name || !formData.contribution || !formData.members || !formData.frequency) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.from("chamas").insert({
      name: formData.name,
      description: formData.description || null,
      creator_id: user.id,
      contribution_amount: Number(formData.contribution),
      frequency: formData.frequency,
      max_members: Number(formData.members),
      total_rounds: Number(formData.members),
    }).select().single();

    if (error) {
      toast.error("Failed to create chama");
      setSubmitting(false);
      return;
    }

    // Auto-join as admin
    await supabase.from("chama_members").insert({
      chama_id: data.id,
      user_id: user.id,
      role: "admin",
      payout_position: 1,
    });

    setInviteCode(data.invite_code);
    setStep(2);
    toast.success("Chama created successfully!");
    setSubmitting(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }

    const { data: chama, error: findError } = await supabase
      .from("chamas")
      .select("*, chama_members(count)")
      .eq("invite_code", joinCode.trim().toUpperCase())
      .single();

    if (findError || !chama) {
      toast.error("Invalid invite code");
      return;
    }

    const memberCount = (chama as any).chama_members?.[0]?.count || 0;
    if (memberCount >= chama.max_members) {
      toast.error("This chama is already full");
      return;
    }

    const { error } = await supabase.from("chama_members").insert({
      chama_id: chama.id,
      user_id: user.id,
    });

    if (error) {
      if (error.code === "23505") toast.error("You're already a member");
      else toast.error("Failed to join chama");
      return;
    }

    toast.success(`Joined ${chama.name}!`);
    setShowJoin(false);
    navigate("/dashboard");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            {step === 1 ? "Create or Join a Chama" : "Chama Created! 🎉"}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 ? "Start a new group or join an existing one with an invite code." : "Share the invite code below with your members."}
          </p>
        </motion.div>

        {step === 1 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            {/* Join button */}
            <div className="flex justify-center mb-6">
              <Button variant="secondary" onClick={() => setShowJoin(true)}>
                <Search className="w-4 h-4 mr-2" /> Join with Invite Code
              </Button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or create new</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Card className="p-6 md:p-8 border border-border shadow-card">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-foreground mb-2 block">Chama Name</Label>
                  <Input id="name" placeholder="e.g., Maisha Savings Group" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Description (optional)</Label>
                  <Input placeholder="Brief description of your chama" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-12" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contribution" className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" /> Contribution (KES)
                    </Label>
                    <Input id="contribution" type="number" placeholder="5,000" value={formData.contribution} onChange={(e) => setFormData({ ...formData, contribution: e.target.value })} className="h-12" />
                  </div>
                  <div>
                    <Label htmlFor="members" className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" /> Total Members
                    </Label>
                    <Input id="members" type="number" placeholder="6" min={2} max={50} value={formData.members} onChange={(e) => setFormData({ ...formData, members: e.target.value })} className="h-12" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" /> Contribution Frequency
                  </Label>
                  <Select value={formData.frequency} onValueChange={(val) => setFormData({ ...formData, frequency: val })}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.contribution && formData.members && (
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Cycle Value</p>
                    <p className="text-2xl font-display font-bold text-foreground">
                      KES {(Number(formData.contribution) * Number(formData.members)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Each member receives this amount on their payout round</p>
                  </div>
                )}
                <Button onClick={handleCreate} className="w-full h-12 text-base" variant="default" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Chama"}
                  {!submitting && <ArrowRight className="w-5 h-5 ml-1" />}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <Card className="p-6 md:p-8 border border-border shadow-card text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground mb-2">{formData.name} Created! 🎉</h2>
              <p className="text-muted-foreground mb-6">Share the invite code below with your members to join.</p>
              <div className="flex items-center justify-center gap-2 bg-muted rounded-xl p-4 mb-6">
                <code className="text-xl font-mono font-bold text-foreground tracking-widest">{inviteCode}</code>
                <Button variant="ghost" size="icon" onClick={copyCode}><Copy className="w-5 h-5 text-muted-foreground" /></Button>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-left mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contribution</span>
                  <span className="font-medium text-foreground">KES {Number(formData.contribution).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium text-foreground">{formData.members}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium text-foreground capitalize">{formData.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cycle Value</span>
                  <span className="font-bold text-primary">KES {(Number(formData.contribution) * Number(formData.members)).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="default" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
                <Button variant="secondary" onClick={() => { setStep(1); setFormData({ name: "", contribution: "", members: "", frequency: "", description: "" }); }}>Create Another</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Join Dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Chama</DialogTitle>
            <DialogDescription>Enter the invite code shared with you</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Invite Code</Label>
            <Input placeholder="e.g., CHAMA-X7K9P2" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="h-12 font-mono tracking-wider uppercase" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowJoin(false)}>Cancel</Button>
            <Button onClick={handleJoin}>Join Chama</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
