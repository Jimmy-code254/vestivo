import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Wallet, Clock, ArrowRight,
  CheckCircle2, AlertCircle, Timer, Banknote, CalendarDays, Video, Bell, PlusCircle, Trophy, AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AIInsights from "@/components/AIInsights";
import DashboardCharts from "@/components/DashboardCharts";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const quickActions = [
  { label: "Wallet", to: "/wallet", icon: Wallet, color: "bg-primary/10 text-primary" },
  { label: "Loans", to: "/loans", icon: Banknote, color: "bg-accent/20 text-accent-foreground" },
  { label: "Events", to: "/events", icon: CalendarDays, color: "bg-secondary text-secondary-foreground" },
  { label: "Meetings", to: "/meetings", icon: Video, color: "bg-primary/10 text-primary" },
  { label: "Reminders", to: "/reminders", icon: Bell, color: "bg-destructive/10 text-destructive" },
  { label: "Penalties", to: "/penalties", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  { label: "New Chama", to: "/create", icon: PlusCircle, color: "bg-muted text-muted-foreground" },
  { label: "Leaderboard", to: "/leaderboard", icon: Trophy, color: "bg-accent/20 text-accent-foreground" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [chamas, setChamas] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loanCount, setLoanCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [upcomingMeetings, setUpcomingMeetings] = useState(0);
  const [reminders, setReminders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const [chamasRes, walletRes, loansRes, eventsRes, meetingsRes, remindersRes] = await Promise.all([
      supabase.from("chama_members").select("*, chamas(*)").eq("user_id", user!.id),
      supabase.from("wallets").select("balance").eq("user_id", user!.id).single(),
      supabase.from("loans").select("id", { count: "exact", head: true }).eq("borrower_id", user!.id).in("status", ["pending", "active"]),
      supabase.from("event_members").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      supabase.from("meetings").select("id", { count: "exact", head: true }).gte("scheduled_at", new Date().toISOString()).eq("status", "scheduled"),
      supabase.from("reminders").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false),
    ]);

    if (chamasRes.data) setChamas(chamasRes.data);
    if (walletRes.data) setWalletBalance(Number(walletRes.data.balance));
    setLoanCount(loansRes.count || 0);
    setEventCount(eventsRes.count || 0);
    setUpcomingMeetings(meetingsRes.count || 0);
    setReminders(remindersRes.count || 0);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Welcome to Vestivo</h1>
          <p className="text-muted-foreground mb-6">Sign in to access your dashboard</p>
          <Link to="/auth"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-6xl">
        {/* Header */}
        <motion.div {...fadeIn} className="mb-8">
          <h1 className="page-title mb-1">
            Welcome back 👋
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Wallet Balance", value: `KES ${walletBalance.toLocaleString()}`, icon: Wallet, accent: true },
            { label: "Active Loans", value: String(loanCount), icon: Banknote },
            { label: "Upcoming Meetings", value: String(upcomingMeetings), icon: Video },
            { label: "Reminders", value: String(reminders), icon: Bell },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 md:p-5 border border-border shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.accent ? "bg-primary/10" : "bg-muted"}`}>
                  <stat.icon className={`w-5 h-5 ${stat.accent ? "text-primary" : "text-muted-foreground"}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-display font-bold text-card-foreground">{stat.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="mb-8">
          <h2 className="font-display font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to}>
                  <Card className="p-4 border border-border shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 text-center cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-card-foreground">{action.label}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div {...fadeIn} transition={{ delay: 0.17 }} className="mb-8">
          <AIInsights />
        </motion.div>

        {/* Financial Charts */}
        <motion.div {...fadeIn} transition={{ delay: 0.19 }} className="mb-8">
          <DashboardCharts />
        </motion.div>

        {/* My Chamas */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">My Chamas</h2>
            <Link to="/create">
              <Button variant="secondary" size="sm">
                <PlusCircle className="w-4 h-4 mr-1" /> New
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : chamas.length === 0 ? (
            <Card className="p-12 text-center border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-foreground mb-2">No chamas yet</h3>
              <p className="text-muted-foreground mb-4">Create or join a chama to get started</p>
              <Link to="/create"><Button>Create or Join Chama</Button></Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {chamas.map((membership) => {
                const chama = (membership as any).chamas;
                if (!chama) return null;
                const progress = chama.total_rounds > 0 ? (chama.current_round / chama.total_rounds) * 100 : 0;
                return (
                  <Link key={membership.id} to={`/chama/${chama.id}`}>
                  <Card className="p-5 border border-border shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-card-foreground">{chama.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{chama.frequency} · KES {Number(chama.contribution_amount).toLocaleString()}</p>
                      </div>
                      <Badge variant="secondary" className={
                        chama.status === "active" ? "bg-primary/10 text-primary" :
                        chama.status === "completed" ? "bg-muted text-muted-foreground" :
                        "bg-destructive/10 text-destructive"
                      }>
                        {chama.status}
                      </Badge>
                    </div>
                    {chama.total_rounds > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Round {chama.current_round}/{chama.total_rounds}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-muted [&>div]:bg-primary" />
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{chama.max_members} members max</span>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        Role: {membership.role}
                      </span>
                    </div>
                  </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
