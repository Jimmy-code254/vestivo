import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { User, Camera, Mail, Phone, Shield, Calendar, Save, Loader2, TrendingUp, ArrowDownLeft, ArrowUpRight, Repeat, Wallet } from "lucide-react";
import { toast } from "sonner";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

// ─── Activity types ───────────────────────────────────────────────────────────

interface ChamsaWithDetails {
  name: string | null;
  frequency: string | null;
  contribution_amount: number | null;
  status: string | null;
}

interface MembershipRow {
  chama_id: string;
  role: string;
  status: string;
  total_contributed: number;
  payout_position: number | null;
  joined_at: string;
  chamas: ChamsaWithDetails | null;
}

interface WalletTxRow {
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<{
    display_name: string;
    phone: string;
    avatar_url: string | null;
  }>({ display_name: "", phone: "", avatar_url: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ chamas: 0, events: 0, loans: 0 });

  // Activity state
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [transactions, setTransactions] = useState<WalletTxRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchProfile();
      fetchStats();
      fetchActivity();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("display_name, phone, avatar_url")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setProfile({
        display_name: data.display_name || "",
        phone: data.phone || "",
        avatar_url: data.avatar_url,
      });
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const [chamaRes, eventRes, loanRes] = await Promise.all([
      supabase.from("chama_members").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("event_members").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("loans").select("id", { count: "exact", head: true }).eq("borrower_id", user!.id),
    ]);
    setStats({
      chamas: chamaRes.count || 0,
      events: eventRes.count || 0,
      loans: loanRes.count || 0,
    });
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const [membRes, txRes] = await Promise.all([
        supabase
          .from("chama_members")
          .select(
            "chama_id, role, status, total_contributed, payout_position, joined_at, chamas(name, frequency, contribution_amount, status)"
          )
          .eq("user_id", user!.id),
        supabase
          .from("wallet_transactions")
          .select("type, amount, description, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (membRes.data) {
        const rows: MembershipRow[] = membRes.data.map((m) => ({
          chama_id: m.chama_id,
          role: m.role,
          status: m.status,
          total_contributed: Number(m.total_contributed) || 0,
          payout_position: m.payout_position ?? null,
          joined_at: m.joined_at,
          chamas: m.chamas as ChamsaWithDetails | null,
        }));
        setMemberships(rows);
      }

      if (txRes.data) {
        const rows: WalletTxRow[] = txRes.data.map((t) => ({
          type: t.type,
          amount: Number(t.amount),
          description: (t as { description?: string | null }).description ?? null,
          created_at: t.created_at,
        }));
        setTransactions(rows);
      }
    } catch {
      // Activity is non-critical; silently skip
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name.trim(),
        phone: profile.phone.trim() || null,
      })
      .eq("user_id", user!.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user!.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user!.id);

    if (updateError) {
      toast.error("Failed to save avatar");
    } else {
      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
      toast.success("Avatar updated!");
    }
    setUploading(false);
  };

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-3xl">
        <motion.div {...fadeIn} className="mb-8">
          <h1 className="page-title mb-1">My Profile</h1>
          <p className="page-description">Manage your account details and preferences.</p>
        </motion.div>

        {/* Avatar & Identity */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="mb-6 border border-border shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-border">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-display font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {profile.display_name || "Unnamed User"}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {isAdmin && (
                      <Badge variant="default" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      Joined {new Date(user?.created_at || "").toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Chamas", value: stats.chamas },
            { label: "Events", value: stats.events },
            { label: "Loans", value: stats.loans },
          ].map((s) => (
            <Card key={s.label} className="p-4 text-center border border-border shadow-card">
              <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </motion.div>

        {/* Edit Form */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="border border-border shadow-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <User className="w-5 h-5" /> Personal Information
              </CardTitle>
              <CardDescription>Update your display name and phone number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="Your name"
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">Used for M-Pesa transactions</p>
              </div>

              <Separator />

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── My Savings Activity ── */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="mt-8 space-y-6">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> My Savings Activity
          </h2>

          {activityLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Contributed",
                    value: `KES ${memberships.reduce((s, m) => s + m.total_contributed, 0).toLocaleString()}`,
                  },
                  { label: "Active Chamas", value: memberships.filter((m) => m.status === "active").length },
                  { label: "Recent Transactions", value: transactions.length },
                ].map((s) => (
                  <Card key={s.label} className="p-4 text-center border border-border shadow-card">
                    <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </Card>
                ))}
              </div>

              {/* Chama memberships */}
              {memberships.length > 0 && (
                <Card className="border border-border shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">Chama Memberships</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {memberships.map((m) => (
                        <div key={m.chama_id} className="flex items-center justify-between px-6 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {m.chamas?.name ?? "Unknown Chama"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {m.chamas?.frequency ?? ""}{m.payout_position != null ? ` · Payout #${m.payout_position}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-sm font-medium text-foreground">
                              KES {m.total_contributed.toLocaleString()}
                            </span>
                            <Badge
                              variant="secondary"
                              className={
                                m.role === "creator"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {m.role}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                m.status === "active"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-destructive/10 text-destructive"
                              }
                            >
                              {m.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent wallet transactions */}
              {transactions.length > 0 && (
                <Card className="border border-border shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Recent Wallet Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {transactions.map((tx, idx) => {
                        const isCredit = tx.type === "credit" || tx.type === "deposit" || tx.type === "payout";
                        const TxIcon = isCredit ? ArrowDownLeft : ArrowUpRight;
                        return (
                          <div key={idx} className="flex items-center gap-3 px-6 py-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isCredit ? "bg-primary/10" : "bg-destructive/10"
                              }`}
                            >
                              <TxIcon
                                className={`w-4 h-4 ${isCredit ? "text-primary" : "text-destructive"}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">
                                {tx.description ?? tx.type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString("en-KE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <span
                              className={`text-sm font-semibold shrink-0 ${
                                isCredit ? "text-primary" : "text-destructive"
                              }`}
                            >
                              {isCredit ? "+" : "-"}KES {tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {memberships.length === 0 && transactions.length === 0 && (
                <Card className="border border-border shadow-card">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Repeat className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No savings activity yet. Join a chama to get started!</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
