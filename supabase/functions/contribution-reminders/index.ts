import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active chamas
    const { data: chamas } = await supabase
      .from("chamas")
      .select("id, name, contribution_amount, frequency, current_round")
      .eq("status", "active");

    if (!chamas || chamas.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active chamas found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersCreated = 0;

    for (const chama of chamas) {
      // Get active members
      const { data: members } = await supabase
        .from("chama_members")
        .select("user_id")
        .eq("chama_id", chama.id)
        .eq("status", "active");

      if (!members) continue;

      // Check who hasn't contributed for current round
      const { data: contributions } = await supabase
        .from("chama_contributions")
        .select("user_id")
        .eq("chama_id", chama.id)
        .eq("round_number", chama.current_round)
        .eq("status", "paid");

      const paidUserIds = new Set(
        (contributions || []).map((c: any) => c.user_id)
      );

      // Calculate due date based on frequency
      const now = new Date();
      const dueDate = new Date();
      if (chama.frequency === "weekly") {
        dueDate.setDate(now.getDate() + 3); // 3 days from now
      } else if (chama.frequency === "biweekly") {
        dueDate.setDate(now.getDate() + 5);
      } else {
        dueDate.setDate(now.getDate() + 7); // monthly default: 7 days
      }

      for (const member of members) {
        if (paidUserIds.has(member.user_id)) continue;

        // Check if reminder already exists for this round
        const { data: existing } = await supabase
          .from("reminders")
          .select("id")
          .eq("user_id", member.user_id)
          .eq("reminder_type", "contribution")
          .eq("title", `Contribution due: ${chama.name} (Round ${chama.current_round})`)
          .eq("is_read", false)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create reminder
        await supabase.from("reminders").insert({
          user_id: member.user_id,
          title: `Contribution due: ${chama.name} (Round ${chama.current_round})`,
          message: `Pay KES ${Number(chama.contribution_amount).toLocaleString()} for round ${chama.current_round}`,
          reminder_type: "contribution",
          due_date: dueDate.toISOString(),
        });

        // Also create a notification
        await supabase.from("notifications").insert({
          user_id: member.user_id,
          title: `Contribution Reminder`,
          message: `Your KES ${Number(chama.contribution_amount).toLocaleString()} contribution for "${chama.name}" (Round ${chama.current_round}) is due soon.`,
          type: "reminder",
          link: `/chama/${chama.id}`,
        });

        remindersCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_created: remindersCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
