import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Send, TrendingUp, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import StatementExport from "@/components/StatementExport";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  created_at: string;
  payment_status: "pending" | "completed" | "failed";
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof ArrowUpRight }> = {
  deposit: { label: "Deposit", color: "bg-primary/10 text-primary", icon: ArrowDownLeft },
  withdrawal: { label: "Withdrawal", color: "bg-destructive/10 text-destructive", icon: ArrowUpRight },
  contribution: { label: "Contribution", color: "bg-accent/20 text-accent-foreground", icon: Send },
  payout: { label: "Payout", color: "bg-primary/10 text-primary", icon: ArrowDownLeft },
  penalty: { label: "Penalty", color: "bg-destructive/10 text-destructive", icon: ArrowUpRight },
  loan_disbursement: { label: "Loan", color: "bg-primary/10 text-primary", icon: ArrowDownLeft },
  loan_repayment: { label: "Repayment", color: "bg-accent/20 text-accent-foreground", icon: ArrowUpRight },
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stkSent, setStkSent] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      toast.error("Failed to load your wallet");
      setLoading(false);
      return;
    }
    setBalance(Number(wallet.balance));
    setWalletId(wallet.id);

    const { data: txns, error: transactionsError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (transactionsError) {
      toast.error("Failed to load wallet transactions");
      setLoading(false);
      return;
    }
    setTransactions(txns || []);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    if (profileError) toast.error("Failed to load your profile name");
    setDisplayName(profile?.display_name || user.email || "");
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) void fetchWallet();
  }, [user, authLoading, fetchWallet, navigate]);

  // Realtime subscriptions for wallet balance and transactions
  useEffect(() => {
    if (!user || !walletId) return;

    const channel = supabase
      .channel('wallet-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new && 'balance' in payload.new) {
            setBalance(Number(payload.new.balance));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `wallet_id=eq.${walletId}` },
        (payload) => {
          const newTx = payload.new as Transaction;
          setTransactions((prev) => [newTx, ...prev].slice(0, 20));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallet_transactions', filter: `wallet_id=eq.${walletId}` },
        (payload) => {
          const updated = payload.new as Transaction;
          setTransactions((prev) => prev.map((tx) => tx.id === updated.id ? updated : tx));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, walletId]);

  const handleDeposit = async () => {
    const num = Number(amount);
    if (!Number.isSafeInteger(num) || num < 1 || num > 150_000 || !walletId) {
      toast.error("Enter a whole KES amount between 1 and 150,000");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: { amount: num, phone },
      });
      if (error) throw error;
      if (data?.error || !data?.success) {
        toast.error(data?.error || "Could not start the M-Pesa payment");
        return;
      }

      setStkSent(true);
      toast.success("Check your phone for the M-Pesa prompt!");
    } catch (error) {
      console.error("Failed to initiate M-Pesa deposit", error);
      toast.error("Failed to initiate M-Pesa payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="page-container flex items-center justify-center">
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-5xl">
        {/* Header */}
        <motion.div {...fadeIn} className="mb-8">
          <h1 className="page-title mb-1">My Wallet</h1>
          <p className="page-description">Manage your funds and verified M-Pesa deposits.</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
          <Card className="mb-8 overflow-hidden border border-border shadow-elevated">
            <div className="gradient-hero p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/70">Available Balance</p>
                  <p className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
                    KES {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => { setAmount(""); setShowDeposit(true); }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Deposit
                </Button>
                <Button
                  variant="hero-outline"
                  size="sm"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  disabled
                >
                  <Send className="w-4 h-4 mr-1" /> Withdrawals coming soon
                </Button>
              </div>
              <p className="mt-3 text-xs text-primary-foreground/70">
                Withdrawals are unavailable until secure payout processing is configured.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Deposited", value: transactions.filter(t => t.type === "deposit" && t.payment_status === "completed").reduce((s, t) => s + Number(t.amount), 0), icon: ArrowDownLeft },
            { label: "Total Withdrawn", value: transactions.filter(t => t.type === "withdrawal" && t.payment_status === "completed").reduce((s, t) => s + Number(t.amount), 0), icon: ArrowUpRight },
            { label: "Transactions", value: transactions.length, icon: TrendingUp, isCount: true },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 border border-border shadow-card">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-2">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-display font-bold text-card-foreground">
                {stat.isCount ? stat.value : `KES ${stat.value.toLocaleString()}`}
              </p>
            </Card>
          ))}
        </motion.div>

        {/* Transaction History */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card className="border border-border shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="font-display">Transaction History</CardTitle>
                  <CardDescription>Your recent wallet activity</CardDescription>
                </div>
                <StatementExport
                  transactions={transactions}
                  userName={displayName}
                  walletBalance={balance}
                  period={new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
                />
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground/70">Deposit funds to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const config = typeConfig[tx.type] || { label: tx.type, color: "bg-muted text-muted-foreground", icon: Clock };
                    const TxIcon = config.icon;
                    const isCredit = ["deposit", "payout", "loan_disbursement"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
                            <TxIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{tx.description || config.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isCredit ? "text-primary" : "text-destructive"}`}>
                            {isCredit ? "+" : "-"}KES {Number(tx.amount).toLocaleString()}
                          </p>
                          <div className="flex items-center justify-end gap-1">
                            <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
                              {config.label}
                            </Badge>
                            {tx.payment_status === "pending" && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                            {tx.payment_status === "failed" && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                          </div>
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

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={(open) => { setShowDeposit(open); if (!open) setStkSent(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Deposit Funds</DialogTitle>
            <DialogDescription>Add money to your Vestivo wallet.</DialogDescription>
          </DialogHeader>
          {stkSent ? (
            <div className="text-center py-6 space-y-3">
              <Phone className="w-12 h-12 mx-auto text-primary animate-pulse" />
              <p className="font-semibold text-foreground">M-Pesa prompt sent!</p>
              <p className="text-sm text-muted-foreground">
                Enter your M-Pesa PIN on your phone to complete the deposit. Your balance will update automatically.
              </p>
              <Button variant="outline" onClick={() => { setShowDeposit(false); setStkSent(false); setAmount(""); setPhone(""); fetchWallet(); }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <p className="text-xs text-muted-foreground">You'll receive an STK push on this number</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 5000, 10000].map((preset) => (
                    <Button key={preset} variant="outline" size="sm" onClick={() => setAmount(String(preset))}>
                      KES {preset.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeposit(false)}>Cancel</Button>
                <Button onClick={handleDeposit} disabled={processing}>
                  {processing ? "Processing..." : "Pay via M-Pesa"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
