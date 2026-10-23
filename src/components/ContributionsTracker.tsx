import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

type Member = {
  user_id: string;
  display_name: string | null;
  total_contributed: number;
};

type Contribution = {
  id: string;
  user_id: string;
  round_number: number;
  amount: number;
  status: string;
  paid_at: string | null;
};

interface Props {
  chamaId: string;
  currentRound: number;
  contributionAmount: number;
  members: Member[];
  isCreator: boolean;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  paid: { icon: CheckCircle2, color: "text-primary", label: "Paid" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  overdue: { icon: AlertCircle, color: "text-destructive", label: "Overdue" },
};

export default function ContributionsTracker({ chamaId, currentRound, contributionAmount, members, isCreator }: Props) {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const round = currentRound || 1;

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chama_contributions")
      .select("*")
      .eq("chama_id", chamaId)
      .eq("round_number", round);
    if (error) {
      toast.error("Failed to load contributions");
      setLoading(false);
      return;
    }
    setContributions((data as Contribution[]) || []);
    setLoading(false);
  }, [chamaId, round]);

  useEffect(() => {
    void fetchContributions();
  }, [fetchContributions]);

  const getContributionForMember = (userId: string) => {
    return contributions.find((c) => c.user_id === userId);
  };

  const handlePayContribution = async () => {
    if (!user) return;
    setPaying(true);

    // Check if already paid
    const existing = getContributionForMember(user.id);
    if (existing?.status === "paid") {
      toast.info("You've already paid for this round!");
      setPaying(false);
      return;
    }

    try {
      const { error } = await supabase.rpc("pay_chama_contribution", {
        p_chama_id: chamaId,
        p_round_number: round,
      });
      if (error) throw error;

      toast.success(`KES ${contributionAmount.toLocaleString()} contributed for Round ${round}!`);
      await fetchContributions();
    } catch (error) {
      console.error("Failed to process chama contribution", error);
      toast.error(error instanceof Error ? error.message : "Failed to process contribution");
    } finally {
      setPaying(false);
    }
  };

  const paidCount = contributions.filter((c) => c.status === "paid").length;
  const totalExpected = members.length * contributionAmount;
  const totalPaid = contributions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const progressPercent = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

  const myContribution = user ? getContributionForMember(user.id) : null;
  const hasPaid = myContribution?.status === "paid";

  return (
    <Card className="border border-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Round {round} Contributions
            </CardTitle>
            <CardDescription>
              {paidCount}/{members.length} members paid · KES {totalPaid.toLocaleString()} / {totalExpected.toLocaleString()}
            </CardDescription>
          </div>
          {!hasPaid && (
            <Button size="sm" onClick={handlePayContribution} disabled={paying}>
              {paying ? "Paying..." : `Pay KES ${contributionAmount.toLocaleString()}`}
            </Button>
          )}
        </div>
        <Progress value={progressPercent} className="h-2 mt-3 bg-muted [&>div]:bg-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const contrib = getContributionForMember(m.user_id);
              const status = contrib?.status || "pending";
              const config = statusConfig[status] || statusConfig.pending;
              const Icon = config.icon;

              return (
                <div key={m.user_id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${status === "paid" ? "bg-primary/10" : "bg-muted"}`}>
                      {(m.display_name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.display_name || "Member"}
                        {m.user_id === user?.id && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                      </p>
                      {contrib?.paid_at && (
                        <p className="text-xs text-muted-foreground">
                          Paid {new Date(contrib.paid_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${status === "paid" ? "text-primary" : "text-muted-foreground"}`}>
                      KES {status === "paid" ? Number(contrib!.amount).toLocaleString() : "0"}
                    </span>
                    <Badge variant="secondary" className={`text-[10px] gap-1 ${status === "paid" ? "bg-primary/10 text-primary" : status === "overdue" ? "bg-destructive/10 text-destructive" : ""}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
