import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(162, 63%, 27%)",
  "hsl(42, 95%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(160, 15%, 60%)",
  "hsl(200, 60%, 50%)",
];

export default function DashboardCharts() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user!.id)
      .single();

    if (wallet) {
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("type, amount, created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: true })
        .limit(200);
      setTransactions(txns || []);
    }
    setLoading(false);
  };

  // Process data for charts
  const dailyData = (() => {
    const map = new Map<string, { date: string; deposits: number; withdrawals: number; contributions: number }>();
    transactions.forEach((tx) => {
      const date = new Date(tx.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
      const entry = map.get(date) || { date, deposits: 0, withdrawals: 0, contributions: 0 };
      if (tx.type === "deposit" || tx.type === "payout" || tx.type === "loan_disbursement") entry.deposits += Number(tx.amount);
      else if (tx.type === "withdrawal") entry.withdrawals += Number(tx.amount);
      else if (tx.type === "contribution") entry.contributions += Number(tx.amount);
      map.set(date, entry);
    });
    return Array.from(map.values()).slice(-14);
  })();

  const balanceOverTime = (() => {
    let balance = 0;
    const points: { date: string; balance: number }[] = [];
    transactions.forEach((tx) => {
      const isCredit = ["deposit", "payout", "loan_disbursement"].includes(tx.type);
      balance += isCredit ? Number(tx.amount) : -Number(tx.amount);
      const date = new Date(tx.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
      points.push({ date, balance: Math.max(0, balance) });
    });
    // Deduplicate to last entry per date
    const map = new Map<string, number>();
    points.forEach((p) => map.set(p.date, p.balance));
    return Array.from(map.entries()).map(([date, balance]) => ({ date, balance })).slice(-14);
  })();

  const typeBreakdown = (() => {
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      const current = map.get(tx.type) || 0;
      map.set(tx.type, current + Number(tx.amount));
    });
    const labels: Record<string, string> = {
      deposit: "Deposits", withdrawal: "Withdrawals", contribution: "Contributions",
      payout: "Payouts", penalty: "Penalties", loan_disbursement: "Loans", loan_repayment: "Repayments",
    };
    return Array.from(map.entries()).map(([type, value]) => ({
      name: labels[type] || type,
      value: Math.round(value),
    }));
  })();

  if (loading) {
    return (
      <Card className="border border-border shadow-card p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) return null;

  return (
    <Card className="border border-border shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Financial Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <p className="text-xs text-muted-foreground mb-3">Wallet balance over time</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={balanceOverTime}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(162, 63%, 27%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(162, 63%, 27%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(160, 10%, 45%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Balance"]} />
                <Area type="monotone" dataKey="balance" stroke="hsl(162, 63%, 27%)" fillOpacity={1} fill="url(#balGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="activity">
            <p className="text-xs text-muted-foreground mb-3">Deposits vs Withdrawals (last 14 days)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(160, 10%, 45%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(160, 10%, 45%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="deposits" fill="hsl(162, 63%, 27%)" radius={[4, 4, 0, 0]} name="Deposits" />
                <Bar dataKey="withdrawals" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Withdrawals" />
                <Bar dataKey="contributions" fill="hsl(42, 95%, 55%)" radius={[4, 4, 0, 0]} name="Contributions" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="breakdown">
            <p className="text-xs text-muted-foreground mb-3">Transaction type breakdown</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {typeBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {typeBreakdown.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-foreground">{entry.name}</span>
                    <span className="ml-auto text-muted-foreground">KES {entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
