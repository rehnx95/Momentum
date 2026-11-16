import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../../../shared/lib/supabase";
function ProfileSettings({ userId, profile, onBack, onSaved, header }) {
  const [form, setForm] = useState({
    name: profile?.name || "",
    username: profile?.username || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState("idle");
  const closeTimer = useRef(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!/^(?=.*[a-z0-9])[a-z0-9-]{3,45}$/.test(username)) {
      setUsernameAvailability("idle");
      return undefined;
    }
    if (username === (profile?.username || "").toLowerCase()) {
      setUsernameAvailability("current");
      return undefined;
    }

    let active = true;
    setUsernameAvailability("checking");
    const timer = setTimeout(async () => {
      try {
        const { data: isAvailable, error } = await supabase.rpc("is_username_available", {
          candidate_username: username,
        });
        if (error) throw error;
        if (active) setUsernameAvailability(isAvailable ? "available" : "taken");
      } catch (availabilityError) {
        if (!active) return;
        console.error("Failed to check username availability:", availabilityError);
        setUsernameAvailability("error");
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.username, profile?.username]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "username" ? value.toLowerCase() : value,
    }));
    if (name === "username") setUsernameAvailability("idle");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
    };

    if (!values.name) {
      setErrorMessage("Name is required.");
      return;
    }
    if (!/^(?=.*[a-z0-9])[a-z0-9-]{3,45}$/.test(values.username)) {
      setErrorMessage(
        "Username must be 3–45 characters using lowercase letters, numbers, and hyphens.",
      );
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (values.username !== (profile?.username || "").toLowerCase()) {
        const { data: isAvailable, error: availabilityError } = await supabase.rpc(
          "is_username_available",
          {
            candidate_username: values.username,
          },
        );
        if (availabilityError) throw availabilityError;
        if (!isAvailable) {
          setErrorMessage("That username is already taken.");
          return;
        }
      }

      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .select("id, name, username, onboarding_completed")
        .single();
      if (error) throw error;

      onSaved(savedProfile);
      setSuccessMessage("Profile updated successfully.");
      closeTimer.current = setTimeout(onBack, 2000);
    } catch (saveError) {
      console.error("Failed to update profile:", saveError);
      setErrorMessage(
        saveError.code === "23505"
          ? "That username is already taken."
          : "Could not save your profile. Please check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-settings-shell min-h-screen bg-page text-text font-sans">
      {header}

      <main className="app-page">
        <div className="app-page-narrow profile-settings-content">
          <div className="mb-5">
            <button type="button" onClick={onBack} className="btn-secondary mb-4">
              <ChevronLeft size={14} /> Back
            </button>
            <h1 className="page-title mb-2">Edit profile</h1>
            <p className="text-sm text-muted">
              Change the name and username shown on your profile.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="settings-form space-y-4 rounded-xl border border-border bg-panel p-4 md:p-5"
          >
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-danger bg-panel p-3 text-sm text-danger"
              >
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p
                role="status"
                className="rounded-lg border border-success bg-panel p-3 text-sm text-success"
              >
                {successMessage}
              </p>
            )}

            {[
              {
                name: "name",
                label: "Name",
                type: "text",
                autoComplete: "name",
                required: true,
                maxLength: 100,
              },
              {
                name: "username",
                label: "Username",
                type: "text",
                autoComplete: "username",
                required: true,
                maxLength: 45,
              },
            ].map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={`profile-${field.name}`}
                  className="mb-1.5 block text-sm font-medium"
                >
                  {field.label}
                </label>
                <input
                  id={`profile-${field.name}`}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  aria-describedby={field.name === "username" ? "profile-username-help" : undefined}
                  aria-invalid={field.name === "username" && usernameAvailability === "taken"}
                  required={field.required}
                  maxLength={field.maxLength}
                  value={form[field.name]}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border-strong bg-page px-3 py-2.5 text-text placeholder:text-muted outline-none transition-colors focus:border-accent focus:outline-none"
                />
                {field.name === "username" && (
                  <div className="mt-1 space-y-1">
                    <p id="profile-username-help" className="text-xs text-muted">
                      3–45 characters; lowercase letters, numbers, and hyphens.
                    </p>
                    {usernameAvailability === "checking" && (
                      <p role="status" className="text-xs text-muted">
                        Checking username…
                      </p>
                    )}
                    {usernameAvailability === "available" && (
                      <p role="status" className="text-xs text-success">
                        Username is available.
                      </p>
                    )}
                    {usernameAvailability === "taken" && (
                      <p role="status" className="text-xs text-danger">
                        That username is already taken.
                      </p>
                    )}
                    {usernameAvailability === "current" && (
                      <p role="status" className="text-xs text-muted">
                        This is your current username.
                      </p>
                    )}
                    {usernameAvailability === "error" && (
                      <p role="alert" className="text-xs text-danger">
                        Could not check username availability. You can still try saving.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-page transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ProfileSettings;
