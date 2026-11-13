import { useState, useEffect } from "react";
import { supabase } from "../../shared/lib/supabase";
import MomentumBrand from "../../shared/components/MomentumBrand";
import Tooltip from "../../shared/components/Tooltip";
import { User, LogOut } from "lucide-react";

export default function OnboardingPage({
  user,
  profile,
  onGoToDashboard,
  onComplete,
  onSignOut,
}) {
  const [formData, setFormData] = useState({
    name:
      profile?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "",
    username: profile?.username || "",
    location: profile?.location || "",
    website: profile?.website || "",
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
        setValidationMessage(
          "Could not check username availability. You can still try saving it.",
        );
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [formData.username, user.id]);

  const validateUsername = (username) => {
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 45) return "Username must be 45 characters or fewer";
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
    else if (usernameAvailable === false)
      newErrors.username = "Username is already taken";

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
            location: formData.location.trim(),
            website: formData.website.trim(),
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id, name, username, location, website, onboarding_completed")
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
    <div className="profile-settings-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans flex flex-col">
      {/* Header */}
      <header className="dashboard-header bg-[#000000]/80 backdrop-blur-xl border-b border-[#262626]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MomentumBrand
              onNavigate={onGoToDashboard}
              subtitle="Complete your profile"
            />
          </div>
          <Tooltip label="Sign out of your account">
            <button
              onClick={onSignOut}
              className="text-[#A1A1A1] hover:text-[#EDEDED] flex items-center gap-2 text-sm"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="onboarding-panel bg-[#0A0A0A] rounded-2xl border border-[#262626] p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              Welcome to Momentum
            </h2>
            <p className="text-[#A1A1A1]">
              Set up your profile to make Momentum yours. Keep your learning,
              routines, and daily progress moving forward.
            </p>
          </div>

          {errors.submit && (
            <div className="bg-rowHover border border-border-strong rounded-lg p-3 mb-6 text-muted text-sm">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-[#EDEDED] mb-2">
                Full Name <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]"
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-[#000000] border border-[#262626] rounded-lg text-[#EDEDED] placeholder-[#A1A1A1] focus:outline-none focus:ring-2 focus:ring-[#EDEDED] focus:border-transparent transition-all"
                />
              </div>
              {errors.name && (
                <p className="text-muted text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-[#EDEDED] mb-2">
                Username (Handle) <span className="text-muted">*</span>
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]"
                />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  maxLength={45}
                  className={`w-full pl-10 pr-4 py-3 bg-[#000000] border rounded-lg text-[#EDEDED] placeholder-[#A1A1A1] focus:outline-none focus:ring-2 transition-all ${
                    usernameAvailable === true
                      ? "border-border-strong focus:ring-border-strong"
                      : usernameAvailable === false
                        ? "border-border-strong focus:ring-border-strong"
                        : "border-[#262626] focus:ring-[#EDEDED]"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {usernameAvailable === true && (
                    <span className="text-muted text-xs flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-muted rounded-full" />
                      Available
                    </span>
                  )}
                  {usernameAvailable === false && (
                    <span className="text-muted text-xs flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-muted rounded-full" />
                      Taken
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#A1A1A1] mt-1">
                3–45 characters, lowercase letters, numbers, and hyphens only
              </p>
              <p
                className={`text-sm mt-1 ${validationMessage ? "text-muted" : "text-[#A1A1A1]"}`}
              >
                {validationMessage}
              </p>
            </div>

            {/* Location Field */}
            <div>
              <label className="block text-sm font-medium text-[#EDEDED] mb-2">
                Location
              </label>
              <div className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="New York, USA"
                  className="w-full pl-10 pr-4 py-3 bg-[#000000] border border-[#262626] rounded-lg text-[#EDEDED] placeholder-[#A1A1A1] focus:outline-none focus:ring-2 focus:ring-[#EDEDED] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Website Field */}
            <div>
              <label className="block text-sm font-medium text-[#EDEDED] mb-2">
                Website / Portfolio
              </label>
              <div className="relative">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://johndoe.dev"
                  className="w-full pl-10 pr-4 py-3 bg-[#000000] border border-[#262626] rounded-lg text-[#EDEDED] placeholder-[#A1A1A1] focus:outline-none focus:ring-2 focus:ring-[#EDEDED] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || usernameAvailable === false}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#EDEDED] hover:bg-white disabled:bg-[#262626] disabled:text-[#A1A1A1] disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#EDEDED] focus:ring-offset-2 focus:ring-offset-[#000000] shadow-lg shadow-[#EDEDED]/20"
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
                    <span>Complete Setup</span>
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
