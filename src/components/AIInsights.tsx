import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, PiggyBank, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Insight = {
  icon: "savings" | "warning" | "tip" | "growth";
  title: string;
  description: string;
  type: "positive" | "warning" | "neutral" | "tip";
};

const iconMap = {
  savings: PiggyBank,
  warning: AlertTriangle,
  tip: Lightbulb,
  growth: TrendingUp,
};

const typeStyles = {
  positive: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
  tip: "bg-accent/20 text-accent-foreground border-accent/30",
};

export default function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights");

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setInsights(data.insights || []);
      setSummary(data.summary || "");
      setLoaded(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI insights");
    }
    setLoading(false);
  };

  return (
    <Card className="border border-border shadow-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Financial Insights
          </CardTitle>
          {loaded && (
            <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        {summary && (
          <p className="text-sm text-muted-foreground mt-1">{summary}</p>
        )}
      </CardHeader>
      <CardContent>
        {!loaded && !loading && (
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/40" />
            <p className="text-sm text-muted-foreground mb-3">
              Get personalized financial tips powered by AI
            </p>
            <Button onClick={fetchInsights} size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" /> Analyze My Finances
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing your finances...</p>
          </div>
        )}

        <AnimatePresence>
          {loaded && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-3"
            >
              {insights.map((insight, i) => {
                const Icon = iconMap[insight.icon] || Lightbulb;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${typeStyles[insight.type]}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-background/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
