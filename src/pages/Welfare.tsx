import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Heart, Wallet, ShieldCheck, ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categories = [
  "Hospital / Medical Bills",
  "Bereavement",
  "Celebrations / Weddings",
  "Emergency Relief",
];

const starterClaims = [
  { id: "wf-1", name: "Nora Atieno", category: "Hospital / Medical Bills", amount: 18000, status: "pending" },
  { id: "wf-2", name: "Samuel Njoroge", category: "Bereavement", amount: 12000, status: "approved" },
];

export default function Welfare() {
  const [claims, setClaims] = useState(starterClaims);
  const [form, setForm] = useState({
    name: "",
    category: "Hospital / Medical Bills",
    amount: "",
    reason: "",
  });

  const handleSubmit = () => {
    if (!form.name || !form.amount || !form.reason) {
      toast.error("Please complete all fields");
      return;
    }

    const nextClaim = {
      id: `wf-${Date.now()}`,
      name: form.name,
      category: form.category,
      amount: Number(form.amount),
      status: "pending",
    };

    setClaims((prev) => [nextClaim, ...prev]);
    toast.success("Claim submitted for review");
    setForm({ name: "", category: "Hospital / Medical Bills", amount: "", reason: "" });
  };

  const handleDisburse = (id: string) => {
    setClaims((prev) => prev.map((claim) => claim.id === id ? { ...claim, status: "disbursed" } : claim));
    toast.success("Welfare claim disbursed to wallet");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="page-container max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="page-title">Chama Welfare Kitty</h1>
          <p className="page-description">Track welfare claims, categories, and wallet disbursements</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {categories.map((category) => (
            <Card key={category} className="p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{category}</span>
              </div>
              <p className="text-xs text-muted-foreground">Available welfare support</p>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.15fr,0.85fr] gap-6">
          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Claim review</h2>
            </div>
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="rounded-xl border border-border p-4 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{claim.name}</p>
                      <p className="text-sm text-muted-foreground">{claim.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">KES {claim.amount.toLocaleString()}</p>
                      <Badge className={claim.status === "disbursed" ? "bg-primary/10 text-primary" : claim.status === "approved" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}>
                        {claim.status}
                      </Badge>
                    </div>
                  </div>
                  {claim.status !== "disbursed" && (
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" onClick={() => handleDisburse(claim.id)}>
                        <Wallet className="w-4 h-4 mr-2" /> Disburse
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Submit claim</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Member name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Claim amount (KES)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleSubmit}>Submit claim</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}




































































































































