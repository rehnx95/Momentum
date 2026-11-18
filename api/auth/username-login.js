import { createClient } from "@supabase/supabase-js";

const usernamePattern = /^[a-z0-9-]{3,48}$/i;
const invalidCredentials = { error: "Invalid username or password." };

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
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!usernamePattern.test(username) || !password || password.length > 256) {
    return res.status(400).json({ error: "Enter a valid username and password." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
    console.error("Username login API is missing Supabase environment variables.");
    return res.status(500).json({ error: "Username sign-in is not configured." });
  }

  try {
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auth = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return res.status(401).json(invalidCredentials);

    const {
      data: { user },
      error: userError,
    } = await admin.auth.admin.getUserById(profile.id);
    if (userError) throw userError;
    if (!user?.email) return res.status(401).json(invalidCredentials);

    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInError || !data.session) return res.status(401).json(invalidCredentials);

    return res.status(200).json({ session: data.session });
  } catch (error) {
    console.error("Username login API failed:", error.message);
    return res.status(500).json({ error: "Could not sign in right now. Please try again." });
  }
}
