import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalDateKey } from "../../../shared/utils/date";
import { supabase } from "../../../shared/lib/supabase";

export default function usePublicProfile(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const profileCache = useRef(new Map());
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [heatmapYear, setHeatmapYear] = useState(null);
  const [heatmap, setHeatmap] = useState({
    username: "",
    year: null,
    activity: {},
    years: [],
  });

  useEffect(() => {
    setHeatmapYear(null);
  }, [username]);

  useEffect(() => {
    if (!username) return undefined;
    let active = true;
    const load = async () => {
      try {
        const { data, error: requestError } = await supabase.rpc("get_public_activity", {
          requested_username: username,
          requested_today: getLocalDateKey(new Date()),
          requested_year: heatmapYear,
        });
        if (requestError) throw requestError;
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data;
        setHeatmap({
          username,
          year: heatmapYear,
          activity: row?.activity || {},
          years: row?.active_years || [],
        });
      } catch (error) {
        console.error("Failed to load public activity:", error);
      }
    };
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [username, heatmapYear]);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setError("");
      return undefined;
    }

    let active = true;
    const cachedProfile = profileCache.current.get(username);
    setProfile(cachedProfile?.profile || null);
    setLoading(!cachedProfile);
    setError("");
    if (cachedProfile && Date.now() - cachedProfile.loadedAt < 60_000) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const loadProfile = async () => {
      try {
        const { data: profileRows, error: profileError } = await supabase.rpc(
          "get_public_profile",
          {
            requested_username: username,
            requested_today: getLocalDateKey(new Date()),
          },
        );
        if (profileError) throw profileError;
        if (!active) return;
        const profileData = profileRows?.[0];
        if (!profileData) {
          setProfile(null);
          setError("This profile could not be found.");
          return;
        }
        profileCache.current.set(username, {
          profile: profileData,
          loadedAt: Date.now(),
        });
        if (profileCache.current.size > 20) {
          const oldestUsername = profileCache.current.keys().next().value;
          profileCache.current.delete(oldestUsername);
        }
        setProfile(profileData);
        setError("");
      } catch (requestError) {
        if (!active) return;
        console.error("Failed to load public profile:", requestError);
        setError(
          "Could not load this profile. Apply the latest public profile migrations and try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();

    return () => {
      active = false;
    };
  }, [username]);

  const copyProfileLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedProfileLink(true);
      window.setTimeout(() => setCopiedProfileLink(false), 1800);
    } catch (error) {
      console.error("Could not copy the public profile link:", error);
      setError("Could not copy the link. Copy the profile URL from your browser address bar.");
    }
  }, []);

  return {
    copiedProfileLink,
    copyProfileLink,
    error,
    heatmap,
    heatmapYear,
    loading,
    profile,
    setHeatmapYear,
  };
}
