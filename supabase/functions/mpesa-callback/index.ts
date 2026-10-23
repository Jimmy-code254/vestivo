import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getNairobiTimestamp = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`;
};

const accepted = () => jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const checkoutRequestId = body?.Body?.stkCallback?.CheckoutRequestID;
    if (typeof checkoutRequestId !== "string" || !checkoutRequestId.trim()) {
      return jsonResponse({ error: "Invalid M-Pesa callback" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase service credentials are not configured");
      return jsonResponse({ error: "Payment service is not configured" }, 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: pendingTransaction, error: transactionError } = await serviceClient
      .from("wallet_transactions")
      .select("id")
      .eq("provider_checkout_id", checkoutRequestId)
      .eq("type", "deposit")
      .eq("payment_status", "pending")
      .maybeSingle();

    if (transactionError) {
      console.error("Could not find pending M-Pesa transaction", transactionError);
      return jsonResponse({ error: "Could not verify payment record" }, 500);
    }
    if (!pendingTransaction) return accepted();

    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const environment = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
    if (!shortcode || !passkey || !consumerKey || !consumerSecret
      || (environment !== "sandbox" && environment !== "production")) {
      console.error("M-Pesa verification credentials are not configured");
      return jsonResponse({ error: "Payment verification is not configured" }, 500);
    }

    const baseUrl = environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
    });
    if (!tokenResponse.ok) {
      console.error("M-Pesa verification token request failed", tokenResponse.status);
      return jsonResponse({ error: "Could not verify payment with M-Pesa" }, 503);
    }
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string") {
      console.error("M-Pesa verification token response was invalid");
      return jsonResponse({ error: "Could not verify payment with M-Pesa" }, 503);
    }

    const timestamp = getNairobiTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const queryResponse = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
    const queryData = await queryResponse.json();

    if (!queryResponse.ok || queryData.ResponseCode !== "0"
      || (queryData.CheckoutRequestID && queryData.CheckoutRequestID !== checkoutRequestId)) {
      console.error("M-Pesa transaction status query failed", queryData.ResponseCode || queryResponse.status);
      return jsonResponse({ error: "M-Pesa has not confirmed this payment yet" }, 503);
    }

    const resultCode = Number(queryData.ResultCode);
    if (!Number.isInteger(resultCode)) {
      return jsonResponse({ error: "M-Pesa payment is still being processed" }, 503);
    }

    if (resultCode === 0) {
      const { data: completion, error: completionError } = await serviceClient.rpc("complete_mpesa_deposit", {
        p_checkout_request_id: checkoutRequestId,
      });
      if (completionError) {
        console.error("Could not complete verified M-Pesa deposit", completionError);
        return jsonResponse({ error: "Could not record verified payment" }, 500);
      }
      if (completion === "not_found") {
        console.error("Verified M-Pesa payment has no matching pending transaction");
        return jsonResponse({ error: "Payment record was not found" }, 503);
      }
      return accepted();
    }

    const failureDescription = typeof queryData.ResultDesc === "string"
      ? queryData.ResultDesc
      : "Payment was not completed";
    const { error: failureError } = await serviceClient.rpc("fail_mpesa_deposit", {
      p_checkout_request_id: checkoutRequestId,
      p_failure_description: failureDescription,
    });
    if (failureError) {
      console.error("Could not record M-Pesa payment failure", failureError);
      return jsonResponse({ error: "Could not record payment result" }, 500);
    }

    return accepted();
  } catch (error) {
    console.error("M-Pesa callback processing failed", error);
    return jsonResponse({ error: "Could not process M-Pesa callback" }, 500);
  }
});
