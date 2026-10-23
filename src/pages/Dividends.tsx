import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Calculator, Users } from "lucide-react";
import { useMemo, useState } from "react";

const formatKes = (amount: number) =>
  `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dividends() {
  const [surplus, setSurplus] = useState("120000");
  const [reservePercent, setReservePercent] = useState("10");
  const [totalShares, setTotalShares] = useState("30");
  const [memberShares, setMemberShares] = useState("1");

  const distribution = useMemo(() => {
    const surplusAmount = Number(surplus);
    const reserveRate = Number(reservePercent);
    const shares = Number(totalShares);
    const selectedShares = Number(memberShares);
    const valid = Number.isFinite(surplusAmount)
      && surplusAmount >= 0
      && Number.isFinite(reserveRate)
      && reserveRate >= 0
      && reserveRate <= 100
      && Number.isFinite(shares)
      && shares > 0
      && Number.isFinite(selectedShares)
      && selectedShares >= 0;

    if (!valid) return null;

    const reserveAmount = surplusAmount * reserveRate / 100;
    const distributableAmount = surplusAmount - reserveAmount;
    const amountPerShare = distributableAmount / shares;

    return {
      reserveAmount,
      distributableAmount,
      amountPerShare,
      memberAmount: amountPerShare * selectedShares,
    };
  }, [surplus, reservePercent, totalShares, memberShares]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="page-container max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Calculator className="w-5 h-5" />
            <span className="text-sm font-medium">Distribution planning</span>
          </div>
          <h1 className="page-title">Dividends</h1>
          <p className="page-description mt-1">
            Estimate a transparent dividend distribution based on member shares.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,1fr] gap-6">
          <Card className="p-5 md:p-6 border border-border">
            <h2 className="font-display font-semibold text-foreground mb-5">Distribution details</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dividend-surplus">Total surplus available (KES)</Label>
                <Input
                  id="dividend-surplus"
                  type="number"
                  min="0"
                  step="0.01"
                  value={surplus}
                  onChange={(event) => setSurplus(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dividend-reserve">Reserve retained (%)</Label>
                <Input
                  id="dividend-reserve"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={reservePercent}
                  onChange={(event) => setReservePercent(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Set aside part of the surplus before calculating payouts.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dividend-total-shares">Total eligible shares</Label>
                <Input
                  id="dividend-total-shares"
                  type="number"
                  min="1"
                  step="1"
                  value={totalShares}
                  onChange={(event) => setTotalShares(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dividend-member-shares">Shares for an example member</Label>
                <Input
                  id="dividend-member-shares"
                  type="number"
                  min="0"
                  step="1"
                  value={memberShares}
                  onChange={(event) => setMemberShares(event.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {distribution ? (
              <>
                <Card className="p-5 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated amount per share</p>
                      <p className="text-2xl font-display font-bold text-foreground">{formatKes(distribution.amountPerShare)}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Reserve retained</span>
                      <span className="font-medium text-foreground">{formatKes(distribution.reserveAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Available for distribution</span>
                      <span className="font-medium text-foreground">{formatKes(distribution.distributableAmount)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border border-border bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Example payout for {Number(memberShares).toLocaleString()} {Number(memberShares) === 1 ? "share" : "shares"}
                      </p>
                      <p className="text-2xl font-display font-bold text-foreground">{formatKes(distribution.memberAmount)}</p>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6 border border-border">
                <h2 className="font-display font-semibold text-foreground mb-2">Check your entries</h2>
                <p className="text-sm text-muted-foreground">
                  Enter a non-negative surplus, a reserve between 0 and 100%, at least one total share, and a non-negative member share count.
                </p>
              </Card>
            )}

            <p className="text-xs text-muted-foreground px-1">
              This is a planning estimate only. Dividend distributions are not currently saved or paid out by Vestivo.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
