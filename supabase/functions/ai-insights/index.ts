import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Fetch user financial data
    const [walletRes, txnRes, loansRes, chamaRes] = await Promise.all([
      supabase.from("wallets").select("balance, currency").eq("user_id", userId).single(),
      supabase.from("wallet_transactions").select("type, amount, description, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("loans").select("amount, status, amount_paid, total_repayment").eq("borrower_id", userId),
      supabase.from("chama_members").select("total_contributed, role, chamas(name, contribution_amount, frequency)")
        .eq("user_id", userId),
    ]);

    const wallet = walletRes.data;
    const transactions = txnRes.data || [];
    const loans = loansRes.data || [];
    const chamas = chamaRes.data || [];

    // Build context summary for AI
    const totalDeposits = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
    const totalWithdrawals = transactions.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
    const totalContributions = transactions.filter(t => t.type === "contribution").reduce((s, t) => s + Number(t.amount), 0);
    const activeLoans = loans.filter(l => l.status === "active");
    const pendingLoanRepayment = activeLoans.reduce((s, l) => s + (Number(l.total_repayment) - Number(l.amount_paid)), 0);

    const financialContext = `
User Financial Summary:
- Wallet Balance: KES ${wallet?.balance || 0}
- Total Deposits (recent 50 txns): KES ${totalDeposits}
- Total Withdrawals (recent 50 txns): KES ${totalWithdrawals}
- Total Contributions to Chamas: KES ${totalContributions}
- Number of Chamas: ${chamas.length}
- Chama details: ${chamas.map((c: any) => `${c.chamas?.name} (${c.chamas?.frequency}, KES ${c.chamas?.contribution_amount}/round, contributed KES ${c.total_contributed})`).join("; ") || "None"}
- Active Loans: ${activeLoans.length}
- Pending Loan Repayment: KES ${pendingLoanRepayment}
- Recent transaction patterns: ${transactions.slice(0, 10).map(t => `${t.type} KES ${t.amount}`).join(", ")}
`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Vestivo AI, a friendly Kenyan financial advisor for a chama (savings group) platform. 
Analyze the user's financial data and provide EXACTLY 4 insights in JSON format.
Each insight should have: "icon" (one of: savings, warning, tip, growth), "title" (short, max 8 words), "description" (1-2 sentences, actionable advice), "type" (one of: positive, warning, neutral, tip).
Focus on: savings habits, contribution consistency, loan health, and smart money tips relevant to Kenyan culture.
Be encouraging but honest. Use KES amounts. Keep it conversational.
Return ONLY valid JSON array, no markdown.`
          },
          {
            role: "user",
            content: financialContext
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Return financial insights for the user",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", enum: ["savings", "warning", "tip", "growth"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["positive", "warning", "neutral", "tip"] }
                      },
                      required: ["icon", "title", "description", "type"],
                      additionalProperties: false
                    }
                  },
                  summary: { type: "string", description: "One-line overall financial health summary" }
                },
                required: ["insights", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try later." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let insights;
    if (toolCall?.function?.arguments) {
      insights = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content || "[]";
      insights = { insights: JSON.parse(content), summary: "Financial analysis complete." };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
