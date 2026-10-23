import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const normalizeKenyanPhone = (phone: string) => {
  const digits = phone.trim().replace(/[\s()-]/g, "").replace(/^\+/, "");
  const normalized = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
  return /^254(?:7|1)\d{8}$/.test(normalized) ? normalized : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Sign in to make a deposit" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Supabase function credentials are not configured");
      return jsonResponse({ error: "Payment service is not configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "A valid sign-in is required" }, 401);
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const phone = typeof body.phone === "string" ? normalizeKenyanPhone(body.phone) : null;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 150_000 || !phone) {
      return jsonResponse({ error: "Enter a valid whole KES amount and Kenyan phone number" }, 400);
    }

    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || `${supabaseUrl}/functions/v1/mpesa-callback`;
    const environment = Deno.env.get("MPESA_ENVIRONMENT") || "sandbox";
    if (!shortcode || !passkey || !consumerKey || !consumerSecret) {
      console.error("M-Pesa credentials are not fully configured");
      return jsonResponse({ error: "M-Pesa is not configured. Contact support." }, 500);
    }
    if (environment !== "sandbox" && environment !== "production") {
      return jsonResponse({ error: "Invalid M-Pesa environment configuration" }, 500);
    }
    try {
      const callback = new URL(callbackUrl);
      if (callback.protocol !== "https:") throw new Error("HTTPS callback URL is required");
    } catch {
      return jsonResponse({ error: "Invalid M-Pesa callback URL configuration" }, 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: wallet, error: walletError } = await serviceClient
      .from("wallets")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();
    if (walletError || !wallet) {
      console.error("Could not resolve wallet for authenticated payment", walletError);
      return jsonResponse({ error: "Could not prepare your wallet deposit" }, 500);
    }

    const baseUrl = environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
    const authString = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authString}` },
    });
    if (!tokenResponse.ok) {
      console.error("M-Pesa token request failed", tokenResponse.status);
      return jsonResponse({ error: "Could not connect to M-Pesa" }, 502);
    }
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string") {
      console.error("M-Pesa token response did not contain an access token");
      return jsonResponse({ error: "Could not authenticate with M-Pesa" }, 502);
    }

    const timestamp = getNairobiTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: "Vestivo",
        TransactionDesc: "Wallet deposit",
      }),
    });
    const stkData = await stkResponse.json();

    if (!stkResponse.ok || stkData.ResponseCode !== "0" || typeof stkData.CheckoutRequestID !== "string") {
      console.error("M-Pesa STK request rejected", stkData.ResponseCode || stkResponse.status);
      return jsonResponse({ error: stkData.errorMessage || "M-Pesa could not start the payment" }, 502);
    }

    const { error: transactionError } = await serviceClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: userData.user.id,
        type: "deposit",
        amount,
        description: `M-Pesa deposit pending - ${phone}`,
        reference: stkData.CheckoutRequestID,
        provider_checkout_id: stkData.CheckoutRequestID,
        payment_status: "pending",
      });
    if (transactionError) {
      console.error("Could not record pending M-Pesa deposit", transactionError);
      return jsonResponse({ error: "Payment started but could not be recorded; contact support before retrying" }, 500);
    }

    return jsonResponse({
      success: true,
      checkout_request_id: stkData.CheckoutRequestID,
      message: "STK push sent. Check your phone.",
    });
  } catch (error) {
    console.error("M-Pesa STK push failed", error);
    return jsonResponse({ error: "Could not start the M-Pesa payment" }, 500);
  }
});
