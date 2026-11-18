import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body =
    typeof req.body === "string"
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return null;
          }
        })()
      : req.body;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || email.length > 320 || !password || password.length < 6 || password.length > 256) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
    console.error("Email sign-up API is missing Supabase environment variables.");
    return res.status(500).json({ error: "Email sign-up is not configured." });
  }

  try {
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      return res.status(400).json({
        error: "Could not create the account. Check your email and password, or sign in instead.",
      });
    }

    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.session) {
      console.error("New account could not be signed in:", signInError?.message);
      return res
        .status(500)
        .json({ error: "Account created, but sign-in failed. Please try again." });
    }

    return res.status(201).json({ session: data.session });
  } catch (error) {
    console.error("Email sign-up API failed:", error.message);
    return res
      .status(500)
      .json({ error: "Could not create the account right now. Please try again." });
  }
}
