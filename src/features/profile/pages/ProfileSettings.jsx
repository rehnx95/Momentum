import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from "../../../shared/lib/supabase";
function ProfileSettings({ userId, profile, onBack, onSaved, header }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    location: profile?.location || '',
    website: profile?.website || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [usernameAvailability, setUsernameAvailability] = useState('idle');
  const closeTimer = useRef(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!/^(?=.*[a-z0-9])[a-z0-9-]{3,48}$/.test(username)) {
      setUsernameAvailability('idle');
      return undefined;
    }
    if (username === (profile?.username || '').toLowerCase()) {
      setUsernameAvailability('current');
      return undefined;
    }

    let active = true;
    setUsernameAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const { data: isAvailable, error } = await supabase.rpc(
          'is_username_available',
          { candidate_username: username },
        );
        if (error) throw error;
        if (active) setUsernameAvailability(isAvailable ? 'available' : 'taken');
      } catch (availabilityError) {
        if (!active) return;
        console.error('Failed to check username availability:', availabilityError);
        setUsernameAvailability('error');
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.username, profile?.username]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm(current => ({
      ...current,
      [name]: name === 'username' ? value.toLowerCase() : value,
    }));
    if (name === 'username') setUsernameAvailability('idle');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      location: form.location.trim(),
      website: form.website.trim(),
    };

    if (!values.name) {
      setErrorMessage('Name is required.');
      return;
    }
    if (!/^(?=.*[a-z0-9])[a-z0-9-]{3,48}$/.test(values.username)) {
      setErrorMessage('Username must be 3–48 characters using lowercase letters, numbers, and hyphens.');
      return;
    }
    if (values.website) {
      try {
        const websiteUrl = new URL(values.website);
        if (!['http:', 'https:'].includes(websiteUrl.protocol)) throw new Error('Invalid URL protocol');
      } catch {
        setErrorMessage('Enter a valid website URL starting with http:// or https://.');
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (values.username !== (profile?.username || '').toLowerCase()) {
        const { data: isAvailable, error: availabilityError } = await supabase.rpc('is_username_available', {
          candidate_username: values.username,
        });
        if (availabilityError) throw availabilityError;
        if (!isAvailable) {
          setErrorMessage('That username is already taken.');
          return;
        }
      }

      const { data: savedProfile, error } = await supabase
        .from('profiles')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id, name, username, location, website, onboarding_completed')
        .single();
      if (error) throw error;

      onSaved(savedProfile);
      setSuccessMessage('Profile updated successfully.');
      closeTimer.current = setTimeout(onBack, 2000);
    } catch (saveError) {
      console.error('Failed to update profile:', saveError);
      setErrorMessage(saveError.code === '23505'
        ? 'That username is already taken.'
        : 'Could not save your profile. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-settings-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans">
      {header}

      <main className="app-page">
        <div className="app-page-narrow profile-settings-content">
        <button type="button" onClick={onBack} className="btn-secondary mb-4">
          <ChevronLeft size={14} /> Back to profile
        </button>
        <h1 className="page-title mb-4">Edit profile</h1>
        <form onSubmit={handleSubmit} className="settings-form space-y-4 rounded-xl border border-[#262626] bg-[#0A0A0A] p-4 md:p-5">
          {errorMessage && (
            <p role="alert" className="rounded-lg border border-border-strong bg-rowHover p-3 text-sm text-muted">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p role="status" className="rounded-lg border border-border-strong bg-rowHover p-3 text-sm text-muted">
              {successMessage}
            </p>
          )}

          {[
            { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 100 },
            { name: 'username', label: 'Username', type: 'text', required: true, maxLength: 48 },
            { name: 'location', label: 'Location', type: 'text', maxLength: 100 },
            { name: 'website', label: 'Website / URL', type: 'url', placeholder: 'https://example.com', maxLength: 2048 },
          ].map(field => (
            <div key={field.name}>
              <label htmlFor={`profile-${field.name}`} className="mb-1.5 block text-sm font-medium">
                {field.label}
              </label>
              <input
                id={`profile-${field.name}`}
                name={field.name}
                type={field.type}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#262626] bg-[#000000] px-3 py-2.5 text-[#EDEDED] placeholder-[#A1A1A1] outline-none transition-colors focus:border-[#EDEDED] focus:outline-none"
              />
              {field.name === 'username' && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-[#A1A1A1]">3–48 characters; lowercase letters, numbers, and hyphens.</p>
                  {usernameAvailability === 'checking' && (
                    <p role="status" className="text-xs text-[#A1A1A1]">Checking username…</p>
                  )}
                  {usernameAvailability === 'available' && (
                    <p role="status" className="text-xs text-muted">Username is available.</p>
                  )}
                  {usernameAvailability === 'taken' && (
                    <p role="status" className="text-xs text-muted">That username is already taken.</p>
                  )}
                  {usernameAvailability === 'current' && (
                    <p role="status" className="text-xs text-[#A1A1A1]">This is your current username.</p>
                  )}
                  {usernameAvailability === 'error' && (
                    <p role="alert" className="text-xs text-muted">Could not check username availability. You can still try saving.</p>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-[#EDEDED] px-4 py-2.5 font-medium text-black transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
        </div>
      </main>
    </div>
  );
}

export default ProfileSettings;
