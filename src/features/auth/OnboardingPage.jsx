import { useState, useEffect } from "react";
import { supabase } from "../../shared/lib/supabase";
import MomentumBrand from "../../shared/components/MomentumBrand";
import Tooltip from "../../shared/components/Tooltip";
import { User, LogOut, CircleCheck, CircleX } from "lucide-react";

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
    <div className="profile-settings-shell onboarding-page min-h-screen bg-page text-text font-sans flex flex-col">
      {/* Header */}
      <header className="dashboard-header backdrop-blur-xl border-b border-subtle">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MomentumBrand onNavigate={onGoToDashboard} subtitle="" />
          </div>
          <Tooltip label="Sign out of your account">
            <button
              onClick={onSignOut}
              className="text-muted hover:text-text flex items-center gap-2 text-sm"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main Content */}
      <main className="onboarding-main mx-auto flex w-full max-w-3xl flex-1 items-center px-4 md:px-6">
        <div
          className="onboarding-panel w-full rounded-2xl border p-6 md:p-8"
          aria-labelledby="onboarding-title"
        >
          <div className="onboarding-intro">
            <h1 id="onboarding-title">Welcome to Momentum</h1>
            <p id="onboarding-description">
              Set up your profile to make Momentum yours. Keep your learning, routines, and daily
              progress moving forward.
            </p>
          </div>

          {errors.submit && (
            <div className="bg-rowHover border border-border-strong rounded-lg p-3 mb-6 text-muted text-sm">
              {errors.submit}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="onboarding-form"
            aria-describedby="onboarding-description"
          >
            {/* Name Field */}
            <div>
              <label
                htmlFor="onboarding-name"
                className="block text-sm font-medium text-text mb-2"
              >
                Full Name <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
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
                  className="w-full pl-10 pr-4 py-3 bg-page border border-subtle rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>
              {errors.name && (
                <p id="onboarding-name-error" className="text-muted text-sm mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label
                htmlFor="onboarding-username"
                className="block text-sm font-medium text-text mb-2"
              >
                Username (Handle) <span className="text-muted">*</span>
              </label>
              <div className="onboarding-username-field">
                <User
                  size={20}
                  className="onboarding-username-icon absolute left-3 top-1/2 -translate-y-1/2 text-muted"
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
                  className={`onboarding-username-input w-full pr-4 py-3 rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 transition-all ${
                    usernameAvailable === true && !errors.username
                      ? "is-available"
                      : usernameAvailable === false || errors.username
                        ? "is-taken"
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

            {/* Submit Button */}
            <div className="onboarding-submit">
              <button
                type="submit"
                disabled={isLoading || usernameAvailable === false}
                className="onboarding-submit-button w-full flex items-center justify-center gap-2 px-4 py-4 bg-accent hover:bg-accentHover disabled:bg-subtle disabled:text-muted disabled:cursor-not-allowed text-onAccent font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-page"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Creating Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Get started</span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
