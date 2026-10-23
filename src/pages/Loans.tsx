import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Banknote, Calculator, Clock, CheckCircle2, XCircle, Shield, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  active: { label: "Active", color: "bg-accent/20 text-accent-foreground", icon: Banknote },
  repaid: { label: "Repaid", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  defaulted: { label: "Defaulted", color: "bg-destructive/10 text-destructive", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

type LoanRecord = Database["public"]["Tables"]["loans"]["Row"] & {
  chama_name: string;
  guarantor_name: string;
  guarantee: {
    status: string;
    guarantor_id: string;
    amount: number;
  } | null;
};

type ChamaOption = { id: string; name: string };
type MemberOption = { user_id: string; display_name: string };
type GuaranteeRequest = {
  id: string;
  loan_id: string;
  guarantor_id: string;
  status: string;
  amount: number;
  borrower_name: string;
  chama_name: string;
  loan_amount: number;
  purpose: string;
};

export default function Loans() {
  const { user, loading: authLoading } = useAuth();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [guaranteeRequests, setGuaranteeRequests] = useState<GuaranteeRequest[]>([]);
  const [chamas, setChamas] = useState<ChamaOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("10");
  const [duration, setDuration] = useState("3");
  const [purpose, setPurpose] = useState("");
  const [chamaId, setChamaId] = useState("");
  const [guarantorId, setGuarantorId] = useState("");
  const [guaranteeAmount, setGuaranteeAmount] = useState("");

  const [calcAmount, setCalcAmount] = useState("10000");
  const [calcRate, setCalcRate] = useState("10");
  const [calcDuration, setCalcDuration] = useState("12");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [loansRes, guaranteesRes] = await Promise.all([
      supabase
        .from("loans")
        .select("*, chamas(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("loan_guarantors")
        .select("id, loan_id, guarantor_id, status, amount, loans(amount, purpose, borrower_id, chamas(name))")
        .eq("guarantor_id", user!.id)
        .order("created_at", { ascending: false }),
    ]);

    if (loansRes.error) {
      toast.error("Failed to load your loan applications");
      setLoading(false);
      return;
    }
    if (guaranteesRes.error) {
      toast.error("Failed to load guarantee requests");
      setLoading(false);
      return;
    }

    const loanIds = (loansRes.data || []).map((loan) => loan.id);
    const ownGuaranteesRes = loanIds.length
      ? await supabase
        .from("loan_guarantors")
        .select("loan_id, status, guarantor_id, amount")
        .in("loan_id", loanIds)
      : { data: [], error: null };

    if (ownGuaranteesRes.error) {
      toast.error("Failed to load loan guarantee decisions");
      setLoading(false);
      return;
    }

    const guarantorIds = Array.from(new Set((ownGuaranteesRes.data || []).map((guarantee) => guarantee.guarantor_id)));
    const guarantorProfilesRes = guarantorIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", guarantorIds)
      : { data: [], error: null };

    if (guarantorProfilesRes.error) {
      toast.error("Failed to load guarantor names");
      setLoading(false);
      return;
    }

    const guarantorNames = new Map(
      (guarantorProfilesRes.data || []).map((profile) => [profile.user_id, profile.display_name]),
    );
    const guaranteesByLoan = new Map((ownGuaranteesRes.data || []).map((guarantee) => [guarantee.loan_id, guarantee]));
    setLoans((loansRes.data || []).map((loan) => ({
      ...loan,
      chama_name: loan.chamas?.name || "Chama",
      guarantee: guaranteesByLoan.get(loan.id) || null,
      guarantor_name: guarantorNames.get(guaranteesByLoan.get(loan.id)?.guarantor_id || "") || "Chama member",
    })));

    const borrowerIds = Array.from(new Set(
      (guaranteesRes.data || [])
        .map((request) => request.loans?.borrower_id)
        .filter((id): id is string => Boolean(id)),
    ));
    const profilesRes = borrowerIds.length
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", borrowerIds)
      : { data: [], error: null };

    if (profilesRes.error) {
      toast.error("Failed to load borrower names for guarantee requests");
      setLoading(false);
      return;
    }

    const profiles = new Map((profilesRes.data || []).map((profile) => [profile.user_id, profile.display_name]));
    setGuaranteeRequests((guaranteesRes.data || []).flatMap((request) => {
      const loan = request.loans;
      if (!loan) return [];
      return [{
        id: request.id,
        loan_id: request.loan_id,
        guarantor_id: request.guarantor_id,
        status: request.status,
        amount: Number(request.amount),
        borrower_name: profiles.get(loan.borrower_id) || "Chama member",
        chama_name: loan.chamas?.name || "Chama",
        loan_amount: Number(loan.amount),
        purpose: loan.purpose || "General loan",
      }];
    }));
    setLoading(false);
  }, [user]);

  const fetchChamas = useCallback(async () => {
    const { data, error } = await supabase
      .from("chama_members")
      .select("chama_id, chamas(id, name)")
      .eq("user_id", user!.id)
      .eq("status", "active");

    if (error) {
      toast.error("Failed to load your active chamas");
      return;
    }

    setChamas((data || []).flatMap((membership) => membership.chamas ? [membership.chamas] : []));
  }, [user]);

  const fetchMembers = useCallback(async (selectedChamaId: string) => {
    setMembers([]);
    setGuarantorId("");
    if (!selectedChamaId) return;

    setLoadingMembers(true);
    const { data: memberships, error } = await supabase
      .from("chama_members")
      .select("user_id")
      .eq("chama_id", selectedChamaId)
      .eq("status", "active")
      .neq("user_id", user!.id);

    if (error) {
      toast.error("Failed to load eligible chama members");
      setLoadingMembers(false);
      return;
    }

    const memberIds = (memberships || []).map((membership) => membership.user_id);
    if (memberIds.length === 0) {
      setLoadingMembers(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", memberIds);

    if (profilesError) {
      toast.error("Failed to load member names");
      setLoadingMembers(false);
      return;
    }

    const names = new Map((profiles || []).map((profile) => [profile.user_id, profile.display_name]));
    setMembers(memberIds.map((memberId) => ({
      user_id: memberId,
      display_name: names.get(memberId) || "Chama member",
    })));
    setLoadingMembers(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void fetchData();
    void fetchChamas();
  }, [user, authLoading, fetchData, fetchChamas]);

  const calculateRepayment = (amt: number, r: number, months: number) => {
    const monthlyRate = r / 100 / 12;
    const totalInterest = amt * monthlyRate * months;
    const total = amt + totalInterest;
    const monthly = total / months;
    return { total, monthly, totalInterest };
  };

  const handleApply = async () => {
    const loanAmount = Number(amount);
    const interestRate = Number(rate);
    const months = Number(duration);
    const guarantee = Number(guaranteeAmount);

    if (!chamaId || !guarantorId || !amount || !rate || !duration || !guaranteeAmount) {
      toast.error("Select a chama, guarantor, and complete all loan details");
      return;
    }
    if (
      !Number.isFinite(loanAmount) || loanAmount <= 0
      || !Number.isFinite(interestRate) || interestRate < 0
      || !Number.isInteger(months) || months <= 0
      || !Number.isFinite(guarantee) || guarantee <= 0 || guarantee > loanAmount
    ) {
      toast.error("Enter a valid loan amount, interest rate, duration, and guarantee amount");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("apply_for_chama_loan", {
      p_chama_id: chamaId,
      p_guarantor_id: guarantorId,
      p_amount: loanAmount,
      p_interest_rate: interestRate,
      p_duration_months: months,
      p_purpose: purpose,
      p_guarantee_amount: guarantee,
    });

    if (error) {
      toast.error(error.message || "Failed to submit your loan application");
      setSubmitting(false);
      return;
    }

    toast.success("Application sent. Your guarantor must approve before the chama can review it.");
    setShowApply(false);
    setAmount("");
    setPurpose("");
    setGuarantorId("");
    setChamaId("");
    setMembers([]);
    setGuaranteeAmount("");
    await fetchData();
    setSubmitting(false);
  };

  const handleGuaranteeAction = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase
      .from("loan_guarantors")
      .update({ status: action })
      .eq("id", id)
      .eq("guarantor_id", user!.id)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message || "Failed to update guarantee request");
      return;
    }
    toast.success(action === "approved" ? "Guarantee approved!" : "Guarantee rejected");
    await fetchData();
  };

  const calc = calculateRepayment(Number(calcAmount) || 0, Number(calcRate) || 0, Number(calcDuration) || 1);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-6xl text-center text-muted-foreground">Loading loan information...</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="page-container max-w-3xl">
          <Card className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="page-title mb-2">Sign in to manage loans</h1>
            <p className="page-description mb-5">Apply for a chama loan or respond to a guarantee request.</p>
            <Button asChild><a href="/auth">Sign in</a></Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-6xl">
        <motion.div {...fadeIn} className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="page-title">Loans</h1>
            <p className="page-description">Apply for loans, manage guarantees, and calculate interest</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowCalculator(true)}>
              <Calculator className="w-4 h-4 mr-2" /> Calculator
            </Button>
            <Button onClick={() => setShowApply(true)} disabled={chamas.length === 0}>
              <Banknote className="w-4 h-4 mr-2" /> Apply for Loan
            </Button>
          </div>
        </motion.div>
        {chamas.length === 0 && (
          <Card className="mb-6 flex items-start gap-3 border-border p-4">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Join an active chama before applying. Loan applications require a guarantor who is also an active member of that chama.
            </p>
          </Card>
        )}

        <Tabs defaultValue="my-loans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-loans">My Loans</TabsTrigger>
            <TabsTrigger value="guarantees">Guarantee Requests ({guaranteeRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="my-loans">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : loans.length === 0 ? (
              <Card className="p-12 text-center border border-border">
                <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display font-semibold text-foreground mb-2">No loans yet</h3>
                <p className="text-muted-foreground mb-4">Apply for your first loan to get started</p>
                <Button onClick={() => setShowApply(true)}>Apply for Loan</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => {
                  const config = statusConfig[loan.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  const progress = loan.total_repayment > 0 ? (loan.amount_paid / loan.total_repayment) * 100 : 0;
                  const guaranteeLabel = loan.guarantee?.status === "pending"
                    ? "Awaiting guarantor"
                    : loan.guarantee?.status === "approved"
                      ? "Guarantor approved"
                      : loan.guarantee?.status === "rejected"
                        ? "Guarantor rejected"
                        : "Legacy application";
                  const guaranteeColor = loan.guarantee?.status === "approved"
                    ? "bg-primary/10 text-primary"
                    : loan.guarantee?.status === "pending"
                      ? "bg-amber-500/10 text-amber-600"
                      : loan.guarantee?.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground";

                  return (
                    <motion.div key={loan.id} {...fadeIn}>
                      <Card className="p-5 border border-border shadow-card">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-display font-semibold text-foreground">
                                KES {Number(loan.amount).toLocaleString()}
                              </h3>
                              <Badge variant="secondary" className={`${config.color} gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                              <Badge className={`${guaranteeColor}`}>
                                {guaranteeLabel}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              <span className="font-medium">Chama:</span> {loan.chama_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {loan.purpose || "General loan"} · {loan.interest_rate}% interest · {loan.duration_months} months
                            </p>
                            {loan.guarantee && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Guarantor: {loan.guarantor_name}
                              </p>
                            )}
                            {loan.guarantee && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Guarantee amount: KES {Number(loan.guarantee.amount).toLocaleString()}
                              </p>
                            )}
                            {loan.status === "active" && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>Repaid: KES {Number(loan.amount_paid).toLocaleString()}</span>
                                  <span>Total: KES {Number(loan.total_repayment).toLocaleString()}</span>
                                </div>
                                <Progress value={progress} className="h-2 bg-muted [&>div]:bg-primary" />
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Monthly payment</p>
                            <p className="font-display font-bold text-foreground">
                              KES {(Number(loan.total_repayment) / loan.duration_months).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="guarantees">
            {guaranteeRequests.length === 0 ? (
              <Card className="p-12 text-center border border-border">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display font-semibold text-foreground mb-2">No guarantee requests</h3>
                <p className="text-muted-foreground">When someone asks you to guarantee their loan, it will appear here</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {guaranteeRequests.map((g) => (
                  <Card key={g.id} className="p-5 border border-border shadow-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-display font-semibold text-foreground">
                          Loan guarantee request
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Borrower: {g.borrower_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Chama: {g.chama_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purpose: {g.purpose} · Loan: KES {g.loan_amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Your guarantee: KES {g.amount.toLocaleString()} · Status: <span className="capitalize">{g.status}</span>
                        </p>
                      </div>
                      {g.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleGuaranteeAction(g.id, "approved")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleGuaranteeAction(g.id, "rejected")}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for a Loan</DialogTitle>
            <DialogDescription>
              Choose a chama member to guarantee your loan. The application will wait for their response.
            </DialogDescription>
          </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1">
          <div>
            <Label>Chama *</Label>
            <Select
              value={chamaId}
              onValueChange={(value) => {
                setChamaId(value);
                void fetchMembers(value);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Choose an active chama" /></SelectTrigger>
              <SelectContent>
                {chamas.map((chama) => (
                  <SelectItem key={chama.id} value={chama.id}>{chama.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="loan-amount">Amount (KES) *</Label>
            <Input id="loan-amount" type="number" min="1" placeholder="10,000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loan-rate">Annual Interest Rate (%) *</Label>
              <Input id="loan-rate" type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
              <div>
                <Label>Duration (months)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 3, 6, 12, 24].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="loan-purpose">Purpose</Label>
              <Input id="loan-purpose" placeholder="e.g., Business expansion" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div>
              <Label>Guarantor from this chama *</Label>
              <Select value={guarantorId} onValueChange={setGuarantorId} disabled={!chamaId || loadingMembers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingMembers ? "Loading members..." : "Choose a chama member"} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>{member.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chamaId && !loadingMembers && members.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">No other active members are available to guarantee this loan.</p>
              )}
            </div>
            <div>
              <Label htmlFor="guarantee-amount">Amount covered by guarantor (KES) *</Label>
              <Input
                id="guarantee-amount"
                type="number"
                min="1"
                max={amount || undefined}
                placeholder="Enter amount covered"
                value={guaranteeAmount}
                onChange={(e) => setGuaranteeAmount(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Must be no more than the requested loan amount.</p>
            </div>
            {amount && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Repayment</p>
                <p className="text-xl font-display font-bold text-foreground">
                  KES {calculateRepayment(Number(amount), Number(rate), Number(duration)).total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Monthly: KES {calculateRepayment(Number(amount), Number(rate), Number(duration)).monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={submitting || loadingMembers || members.length === 0}>
              {submitting ? "Submitting..." : "Send to Guarantor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loan Interest Calculator</DialogTitle>
            <DialogDescription>Calculate your loan repayment before applying</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Loan Amount (KES)</Label>
              <Input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annual Interest (%)</Label>
                <Input type="number" value={calcRate} onChange={(e) => setCalcRate(e.target.value)} />
              </div>
              <div>
                <Label>Duration (months)</Label>
                <Input type="number" value={calcDuration} onChange={(e) => setCalcDuration(e.target.value)} />
              </div>
            </div>
            <div className="bg-muted rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-medium text-foreground">KES {Number(calcAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Interest</span>
                <span className="font-medium text-accent-foreground">KES {calc.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-medium text-foreground">Total Repayment</span>
                <span className="font-display font-bold text-primary text-lg">KES {calc.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Payment</span>
                <span className="font-semibold text-foreground">KES {calc.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
