import { useState, useEffect } from "react";
import { supabase } from "../../shared/lib/supabase";
import { Activity, CircleCheck, CircleX, LogOut, User } from "lucide-react";
import "../../styles/auth.css";
import "../../styles/auth-showcase.css";
import "../../styles/responsive/auth.css";

const USERNAME_MAX_LENGTH = 20;

export default function OnboardingPage({ user, profile, onGoToDashboard, onComplete, onSignOut }) {
  const [formData, setFormData] = useState({
    name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || "",
    username:
      profile?.username && profile.username.length <= USERNAME_MAX_LENGTH
        ? profile.username
        : "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [validationMessage, setValidationMessage] = useState("");

  // Check username availability in real-time
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameAvailable(null);
      setValidationMessage("");
      return;
    }

    setUsernameAvailable(null);
    let active = true;
    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("is_username_available", {
          candidate_username: formData.username,
        });
        if (error) throw error;
        if (!active) return;

        setUsernameAvailable(data);
        setValidationMessage(data ? "" : "This username is already taken");
      } catch (error) {
        console.error("Username availability check failed:", error);
        if (!active) return;
        setUsernameAvailable(null);
        setValidationMessage("Could not check username availability. You can still try saving it.");
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [formData.username, user.id]);

  const validateUsername = (username) => {
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > USERNAME_MAX_LENGTH)
      return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`;
    if (username.includes(" ")) return "Username cannot contain spaces";
    if (!/^(?=.*[a-z0-9])[a-z0-9-]+$/.test(username))
      return "Username must contain a letter or number and use only lowercase letters, numbers, and hyphens";
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "username" ? value.toLowerCase().trim() : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    // Auto-generate username from name
    if (name === "name" && !formData.username) {
      const generatedUsername = nextValue
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      if (generatedUsername) {
        setFormData((prev) => ({ ...prev, username: generatedUsername }));
      }
    }

    // Clear errors
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;
    else if (usernameAvailable === false) newErrors.username = "Username is already taken";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Update profile
      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: formData.name.trim(),
            username: formData.username.trim().toLowerCase(),
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id, name, username, onboarding_completed")
        .single();

      if (error) throw error;

      onComplete(savedProfile);
    } catch (error) {
      console.error("Onboarding error:", error);
      setErrors({
        submit:
          error.code === "23505"
            ? "That username was just taken. Please choose another one."
            : "Failed to save your profile. Check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen bg-page text-text font-sans">
      <div className="auth-layout auth-layout-simple">
        <section className="auth-panel-wrap" aria-labelledby="onboarding-title">
          <div className="auth-panel onboarding-panel onboarding-auth-panel">
            <button
              type="button"
              className="auth-simple-brand onboarding-brand-button"
              onClick={onGoToDashboard}
              aria-label="Momentum - go to dashboard"
            >
              <span className="brand-mark">
                <Activity size={16} strokeWidth={2.25} className="text-onAccent" />
              </span>
              <span>Momentum</span>
            </button>
            <h1 id="onboarding-title" className="auth-simple-title">
              Welcome to Momentum
            </h1>
            <p id="onboarding-description" className="auth-panel-description">
              Set up your profile to make Momentum yours. Keep your learning, routines, and daily
              progress moving forward.
            </p>

            {errors.submit && (
              <p role="alert" className="auth-error-message">
                {errors.submit}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="onboarding-form"
              aria-describedby="onboarding-description"
            >
              <div className="auth-form-field">
                <label htmlFor="onboarding-name">
                  Full Name <span className="text-muted">*</span>
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="onboarding-field-icon absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="onboarding-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "onboarding-name-error" : undefined}
                    className="onboarding-profile-input"
                  />
                </div>
                {errors.name && (
                  <p id="onboarding-name-error" className="text-muted text-sm">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="auth-form-field">
                <label htmlFor="onboarding-username">
                  Username (Handle) <span className="text-muted">*</span>
                </label>
                <div className="onboarding-username-field">
                  <User
                    size={18}
                    className="onboarding-username-icon absolute top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="onboarding-username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="johndoe"
                    maxLength={USERNAME_MAX_LENGTH}
                    aria-invalid={Boolean(errors.username) || usernameAvailable === false}
                    aria-describedby="onboarding-username-status"
                    className={`onboarding-username-input${
                      usernameAvailable === true && !errors.username
                        ? " is-available"
                        : usernameAvailable === false || errors.username
                          ? " is-taken"
                          : ""
                    }`}
                  />
                </div>
                <p
                  id="onboarding-username-status"
                  className={`onboarding-username-status${usernameAvailable === true && !errors.username ? " is-available" : ""}${usernameAvailable === false || errors.username ? " is-taken" : ""}`}
                  aria-live="polite"
                  role={errors.username ? "alert" : undefined}
                >
                  {errors.username ? (
                    <>
                      <CircleX size={16} aria-hidden="true" />
                      <span>{errors.username}</span>
                    </>
                  ) : usernameAvailable === true ? (
                    <>
                      <CircleCheck size={16} aria-hidden="true" />
                      <span>Username is available</span>
                    </>
                  ) : usernameAvailable === false ? (
                    <>
                      <CircleX size={16} aria-hidden="true" />
                      <span>{validationMessage}</span>
                    </>
                  ) : (
                    validationMessage
                  )}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || usernameAvailable === false}
                className="auth-credential-submit onboarding-auth-submit"
              >
                {isLoading ? "Creating profile..." : "Get started"}
              </button>
            </form>

            <p className="auth-mode-switch">
              <button type="button" className="onboarding-signout" onClick={onSignOut}>
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
