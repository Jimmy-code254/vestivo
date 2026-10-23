import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Shield, Users, AlertTriangle, Ban, Search, TrendingUp, Activity, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChamaRow {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  created_at: string;
  creator_id: string;
  memberCount: number;
}

interface UserRow {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  chamaCount: number;
  roles: Database["public"]["Enums"]["app_role"][];
}

interface Stats {
  totalChamas: number;
  activeMembers: number;
  totalVolume: string;
  suspendedChamas: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKES(amount: number): string {
  if (amount >= 1_000_000) {
    return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `KES ${amount.toLocaleString()}`;
}

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  suspended: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { isAdmin, loading: authLoading, adminLoading, user } = useAuth();
  const navigate = useNavigate();

  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalChamas: 0,
    activeMembers: 0,
    totalVolume: "KES 0",
    suspendedChamas: 0,
  });
  const [chamas, setChamas] = useState<ChamaRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [roleActionUserId, setRoleActionUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedChama, setSelectedChama] = useState<ChamaRow | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      toast.error("Admin access required");
      navigate("/");
    }
  }, [authLoading, adminLoading, user, isAdmin, navigate]);

  const fetchStats = useCallback(async () => {
    const [chamasRes, membersRes, walletsRes] = await Promise.all([
      supabase.from("chamas").select("id, status"),
      supabase.from("chama_members").select("id, status").eq("status", "active"),
      supabase.from("wallets").select("balance"),
    ]);

    if (chamasRes.error) throw chamasRes.error;
    if (membersRes.error) throw membersRes.error;
    if (walletsRes.error) throw walletsRes.error;

    const totalVolume =
      walletsRes.data?.reduce((sum, w) => sum + Number(w.balance), 0) ?? 0;
    const suspendedChamas =
      chamasRes.data?.filter((c) => c.status === "suspended").length ?? 0;

    setStats({
      totalChamas: chamasRes.data?.length ?? 0,
      activeMembers: membersRes.data?.length ?? 0,
      totalVolume: formatKES(totalVolume),
      suspendedChamas,
    });
  }, []);

  const fetchChamas = useCallback(async () => {
    const { data, error } = await supabase
      .from("chamas")
      .select(`id, name, status, contribution_amount, created_at, creator_id, chama_members(count)`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows: ChamaRow[] = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status ?? "inactive",
      contribution_amount: Number(c.contribution_amount),
      created_at: c.created_at,
      creator_id: c.creator_id,
      memberCount: Array.isArray(c.chama_members)
        ? (c.chama_members[0] as { count: number } | undefined)?.count ?? 0
        : 0,
    }));

    setChamas(rows);
  }, []);

  const fetchUsers = useCallback(async (offset = 0, append = false) => {
    const { data, error, count } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("user_id", { ascending: true })
      .range(offset, offset + 49);

    if (error) throw error;

    const userIds = (data || []).map((profile) => profile.user_id);
    const [membershipsRes, rolesRes] = userIds.length
      ? await Promise.all([
        supabase.from("chama_members").select("user_id").in("user_id", userIds).eq("status", "active"),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (membershipsRes.error) throw membershipsRes.error;
    if (rolesRes.error) throw rolesRes.error;

    const countMap: Record<string, number> = {};
    for (const m of membershipsRes.data || []) {
      countMap[m.user_id] = (countMap[m.user_id] ?? 0) + 1;
    }
    const roleMap = new Map<string, Database["public"]["Enums"]["app_role"][]>();
    for (const role of rolesRes.data || []) {
      roleMap.set(role.user_id, [...(roleMap.get(role.user_id) || []), role.role]);
    }

    const rows: UserRow[] = (data ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      phone: p.phone,
      created_at: p.created_at,
      chamaCount: countMap[p.user_id] ?? 0,
      roles: roleMap.get(p.user_id) || [],
    }));

    setUsers((previous) => append ? [...previous, ...rows] : rows);
    setHasMoreUsers((count ?? 0) > offset + rows.length);
  }, []);

  // ── Fetch everything ───────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    try {
      await Promise.all([fetchStats(), fetchChamas(), fetchUsers()]);
    } catch (error) {
      console.error("Failed to load admin data", error);
      toast.error("Failed to load admin data");
    } finally {
      setDataLoading(false);
    }
  }, [fetchChamas, fetchStats, fetchUsers]);

  useEffect(() => {
    if (!authLoading && !adminLoading && user && isAdmin) void fetchAll();
  }, [authLoading, adminLoading, user, isAdmin, fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const suspendChama = async (id: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("chamas")
      .update({ status: "suspended" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to suspend chama");
    } else {
      setChamas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "suspended" } : c))
      );
      setStats((prev) => ({
        ...prev,
        suspendedChamas: prev.suspendedChamas + 1,
      }));
      toast.success("Chama suspended");
    }
    setActionLoading(false);
    setShowDialog(false);
    setSelectedChama(null);
  };

  const activateChama = async (id: string) => {
    const { error } = await supabase
      .from("chamas")
      .update({ status: "active" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to activate chama");
    } else {
      setChamas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "active" } : c))
      );
      setStats((prev) => ({
        ...prev,
        suspendedChamas: Math.max(0, prev.suspendedChamas - 1),
      }));
      toast.success("Chama activated");
    }
  };

  const toggleModeratorRole = async (target: UserRow) => {
    const isModerator = target.roles.includes("moderator");
    setRoleActionUserId(target.user_id);
    try {
      const result = isModerator
        ? await supabase.from("user_roles").delete().eq("user_id", target.user_id).eq("role", "moderator")
        : await supabase.from("user_roles").insert({ user_id: target.user_id, role: "moderator" });
      if (result.error) throw result.error;

      setUsers((previous) => previous.map((row) => row.user_id !== target.user_id ? row : {
        ...row,
        roles: isModerator
          ? row.roles.filter((role) => role !== "moderator")
          : [...row.roles, "moderator"],
      }));
      toast.success(isModerator ? "Moderator role removed" : "Moderator role granted");
    } catch (error) {
      console.error("Failed to update user role", error);
      toast.error("Failed to update user role");
    } finally {
      setRoleActionUserId(null);
    }
  };

  const loadMoreUsers = async () => {
    setLoadingMoreUsers(true);
    try {
      await fetchUsers(users.length, true);
    } catch (error) {
      console.error("Failed to load more users", error);
      toast.error("Failed to load more users");
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const filteredChamas = chamas.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    (u.display_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.phone ?? "").includes(userSearch)
  );

  // ── Loading / Guard ────────────────────────────────────────────────────────

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-6xl">

        {/* Header */}
        <motion.div {...fadeIn} className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">Manage and monitor all chamas on the platform.</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Total Chamas", value: dataLoading ? "—" : stats.totalChamas, icon: Users, accent: true },
            { label: "Active Members", value: dataLoading ? "—" : stats.activeMembers, icon: Activity },
            { label: "Total Volume", value: dataLoading ? "—" : stats.totalVolume, icon: TrendingUp },
            { label: "Suspended", value: dataLoading ? "—" : stats.suspendedChamas, icon: AlertTriangle, warning: true },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 border border-border shadow-card">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  stat.warning ? "bg-destructive/10" : stat.accent ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <stat.icon
                  className={`w-5 h-5 ${
                    stat.warning ? "text-destructive" : stat.accent ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-display font-bold text-card-foreground">{stat.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Tabs: Chamas / Users */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="chamas">
            <TabsList className="mb-6">
              <TabsTrigger value="chamas">Chamas</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* ── Chamas Tab ── */}
            <TabsContent value="chamas">
              <Card className="border border-border shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="font-display">All Chamas</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search chamas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Contribution</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChamas.map((chama) => (
                          <TableRow key={chama.id}>
                            <TableCell className="font-medium">{chama.name}</TableCell>
                            <TableCell>{chama.memberCount}</TableCell>
                            <TableCell>KES {chama.contribution_amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={statusColors[chama.status] ?? "bg-muted text-muted-foreground"}
                              >
                                {chama.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(chama.created_at).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {chama.status !== "suspended" ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedChama(chama);
                                    setShowDialog(true);
                                  }}
                                >
                                  <Ban className="w-3 h-3 mr-1" /> Suspend
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => activateChama(chama.id)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> Activate
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredChamas.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              {search ? "No chamas match your search." : "No chamas found."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Users Tab ── */}
            <TabsContent value="users">
              <Card className="border border-border shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="font-display">All Users</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Chamas</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead className="text-right">Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell className="font-medium">
                              {u.display_name ?? <span className="text-muted-foreground italic">Unnamed</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {u.phone ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {u.chamaCount} chama{u.chamaCount !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              {(u.roles.length ? u.roles : ["user"]).map((role) => (
                                <Badge key={role} variant="secondary" className="mr-1 capitalize">
                                  {role}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={u.roles.includes("moderator") ? "outline" : "secondary"}
                                size="sm"
                                disabled={roleActionUserId === u.user_id || u.user_id === user.id}
                                onClick={() => void toggleModeratorRole(u)}
                              >
                                {roleActionUserId === u.user_id
                                  ? "Saving..."
                                  : u.roles.includes("moderator")
                                    ? "Remove moderator"
                                    : "Make moderator"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              {userSearch ? "No users match your search." : "No users found."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                  {!dataLoading && hasMoreUsers && (
                    <div className="flex justify-center border-t border-border p-4">
                      <Button variant="outline" onClick={() => void loadMoreUsers()} disabled={loadingMoreUsers}>
                        {loadingMoreUsers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Load more users
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Chama</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{selectedChama?.name}</strong>? This will freeze all
              contributions and payouts for this group.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => selectedChama && suspendChama(selectedChama.id)}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Suspend Chama
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
