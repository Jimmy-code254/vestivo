import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Trophy, Medal, Flame, Star, TrendingUp, Users, Crown } from "lucide-react";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

type LeaderEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_contributed: number;
  chama_count: number;
};

const rankColors = [
  "bg-accent text-accent-foreground",
  "bg-muted text-foreground",
  "bg-primary/10 text-primary",
];

const rankIcons = [Crown, Medal, Medal];

export default function Leaderboard() {
  const { user } = useAuth();
  const [topSavers, setTopSavers] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    // Get all members with contributions
    const { data: members } = await supabase
      .from("chama_members")
      .select("user_id, total_contributed, chama_id")
      .eq("status", "active");

    if (!members) { setLoading(false); return; }

    // Aggregate by user
    const userMap = new Map<string, { total: number; chamas: Set<string> }>();
    members.forEach((m: any) => {
      const entry = userMap.get(m.user_id) || { total: 0, chamas: new Set() };
      entry.total += Number(m.total_contributed);
      entry.chamas.add(m.chama_id);
      userMap.set(m.user_id, entry);
    });

    const userIds = Array.from(userMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const entries: LeaderEntry[] = Array.from(userMap.entries())
      .map(([uid, data]) => ({
        user_id: uid,
        display_name: profileMap.get(uid)?.display_name || "Member",
        avatar_url: profileMap.get(uid)?.avatar_url || null,
        total_contributed: data.total,
        chama_count: data.chamas.size,
      }))
      .sort((a, b) => b.total_contributed - a.total_contributed)
      .slice(0, 20);

    setTopSavers(entries);
    setLoading(false);
  };

  const getBadges = (entry: LeaderEntry, rank: number) => {
    const badges: { label: string; icon: typeof Star; color: string }[] = [];
    if (rank === 0) badges.push({ label: "Top Saver", icon: Crown, color: "bg-accent/20 text-accent-foreground" });
    if (entry.total_contributed >= 100000) badges.push({ label: "100K Club", icon: Star, color: "bg-primary/10 text-primary" });
    if (entry.chama_count >= 3) badges.push({ label: "Social Saver", icon: Users, color: "bg-secondary text-secondary-foreground" });
    if (entry.total_contributed >= 50000) badges.push({ label: "Consistent", icon: Flame, color: "bg-destructive/10 text-destructive" });
    return badges;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-4xl">
        <motion.div {...fadeIn} className="mb-8">
          <h1 className="page-title mb-1">
            <Trophy className="w-7 h-7 inline mr-2 text-accent" />
            Leaderboard
          </h1>
          <p className="page-description">Top contributors across all chamas</p>
        </motion.div>

        {/* Top 3 Podium */}
        {topSavers.length >= 3 && (
          <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-8">
            {[1, 0, 2].map((idx) => {
              const entry = topSavers[idx];
              const isFirst = idx === 0;
              return (
                <Card key={entry.user_id} className={`p-4 text-center border border-border shadow-card ${isFirst ? "ring-2 ring-accent -mt-2" : ""}`}>
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold ${rankColors[idx] || "bg-muted text-muted-foreground"}`}>
                    {idx === 0 ? "👑" : idx + 1}
                  </div>
                  <p className="text-sm font-display font-bold text-foreground truncate">
                    {entry.display_name}
                    {entry.user_id === user?.id && " (You)"}
                  </p>
                  <p className="text-xs text-muted-foreground">KES {entry.total_contributed.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.chama_count} chama{entry.chama_count !== 1 ? "s" : ""}</p>
                </Card>
              );
            })}
          </motion.div>
        )}

        {/* Full List */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="border border-border shadow-card">
            <CardHeader>
              <CardTitle className="font-display">All Rankings</CardTitle>
              <CardDescription>Based on total contributions across all chamas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading leaderboard...</p>
              ) : topSavers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No contributions yet. Be the first!</p>
              ) : (
                <div className="divide-y divide-border">
                  {topSavers.map((entry, idx) => {
                    const badges = getBadges(entry, idx);
                    const isMe = entry.user_id === user?.id;
                    return (
                      <div key={entry.user_id} className={`flex items-center justify-between py-3 ${isMe ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? rankColors[idx] : "bg-muted text-muted-foreground"}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {entry.display_name}
                              {isMe && <span className="text-xs text-primary ml-1">(You)</span>}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {badges.map((b) => (
                                <Badge key={b.label} variant="secondary" className={`text-[9px] px-1.5 py-0 ${b.color}`}>
                                  {b.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">KES {entry.total_contributed.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.chama_count} chama{entry.chama_count !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
