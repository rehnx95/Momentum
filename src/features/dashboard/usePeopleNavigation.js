import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalDateKey } from "../../shared/utils/date";
import { supabase } from "../../shared/lib/supabase";

function getPeopleRoute(pathname = window.location.pathname) {
  if (pathname === "/people") return { page: "people", username: "" };
  const profileMatch = pathname.match(
    /^\/(?:user|u)\/([A-Za-z0-9-]{3,48})\/?$/,
  );
  if (profileMatch)
    return { page: "profile", username: profileMatch[1].toLowerCase() };
  return { page: "tracker", username: "" };
}

export default function usePeopleNavigation() {
  const [showProfile, setShowProfile] = useState(
    () =>
      window.location.pathname === "/profile" ||
      window.location.pathname === "/profile/edit",
  );
  const [dailyLogPage, setDailyLogPage] = useState(
    () => window.location.pathname === "/daily-log",
  );
  const [showSettings, setShowSettings] = useState(
    () => window.location.pathname === "/profile/edit",
  );
  const [peopleSearchPage, setPeopleSearchPage] = useState(
    () => getPeopleRoute().page === "people",
  );
  const [profileSearchOpen, setProfileSearchOpen] = useState(
    () => getPeopleRoute().page === "people",
  );
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSearchResults, setProfileSearchResults] = useState([]);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState("");
  const [selectedPublicUsername, setSelectedPublicUsername] = useState(
    () => getPeopleRoute().username,
  );
  const [publicProfile, setPublicProfile] = useState(null);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfileError, setPublicProfileError] = useState("");
  const publicProfileCache = useRef(new Map());
  const publicProfileReturnPath = useRef(
    getPeopleRoute().page === "people" ? "/people" : "/",
  );
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [publicHeatmapYear, setPublicHeatmapYear] = useState(null);
  const [publicHeatmap, setPublicHeatmap] = useState({
    username: "",
    year: null,
    activity: {},
    years: [],
  });

  useEffect(() => {
    setPublicHeatmapYear(null);
  }, [selectedPublicUsername]);

  useEffect(() => {
    if (!selectedPublicUsername) return undefined;
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("get_public_activity", {
          requested_username: selectedPublicUsername,
          requested_today: getLocalDateKey(new Date()),
          requested_year: publicHeatmapYear,
        });
        if (error) throw error;
        if (!active) return;
        const row = Array.isArray(data) ? data[0] : data;
        setPublicHeatmap({
          username: selectedPublicUsername,
          year: publicHeatmapYear,
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
  }, [selectedPublicUsername, publicHeatmapYear]);

  useEffect(() => {
    const handlePopState = () => {
      const route = getPeopleRoute();
      setPeopleSearchPage(route.page === "people");
      setProfileSearchOpen(route.page === "people");
      setSelectedPublicUsername(route.username);
      setShowProfile(
        window.location.pathname === "/profile" ||
          window.location.pathname === "/profile/edit",
      );
      setShowSettings(window.location.pathname === "/profile/edit");
      setDailyLogPage(window.location.pathname === "/daily-log");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((path) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    const route = getPeopleRoute(path);
    setPeopleSearchPage(route.page === "people");
    setProfileSearchOpen(route.page === "people");
    setSelectedPublicUsername(route.username);
    setShowProfile(path === "/profile" || path === "/profile/edit");
    setShowSettings(path === "/profile/edit");
    setDailyLogPage(path === "/daily-log");
  }, []);

  useEffect(() => {
    const query = profileSearchQuery.trim();
    if (!profileSearchOpen || query.length < 3) {
      setProfileSearchResults([]);
      setProfileSearchError("");
      setProfileSearchLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setProfileSearchLoading(true);
    setProfileSearchError("");
    const timer = window.setTimeout(async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("Sign in to search users.");

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: controller.signal,
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not search users.");
        if (active) setProfileSearchResults(result.results || []);
      } catch (error) {
        if (!active || error.name === "AbortError") return;
        console.error("Failed to search public profiles:", error);
        setProfileSearchError(
          error.message || "Could not search profiles. Please try again.",
        );
      } finally {
        if (active) setProfileSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [profileSearchOpen, profileSearchQuery]);

  useEffect(() => {
    if (!selectedPublicUsername) {
      setPublicProfile(null);
      setPublicProfileError("");
      return undefined;
    }

    let active = true;
    const cachedProfile = publicProfileCache.current.get(selectedPublicUsername);
    setPublicProfile(cachedProfile?.profile || null);
    setPublicProfileLoading(!cachedProfile);
    setPublicProfileError("");
    if (cachedProfile && Date.now() - cachedProfile.loadedAt < 60_000) {
      setPublicProfileLoading(false);
      return () => {
        active = false;
      };
    }

    const loadPublicProfile = async () => {
      try {
        const { data, error } = await supabase.rpc("get_public_profile", {
          requested_username: selectedPublicUsername,
          requested_today: getLocalDateKey(new Date()),
        });
        if (error) throw error;
        if (!active) return;
        const profileData = data?.[0];
        if (!profileData) {
          setPublicProfile(null);
          setPublicProfileError("This profile could not be found.");
          return;
        }
        publicProfileCache.current.set(selectedPublicUsername, {
          profile: profileData,
          loadedAt: Date.now(),
        });
        if (publicProfileCache.current.size > 20) {
          const oldestUsername = publicProfileCache.current.keys().next().value;
          publicProfileCache.current.delete(oldestUsername);
        }
        setPublicProfile(profileData);
        setPublicProfileError("");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load public profile:", error);
        setPublicProfileError(
          "Could not load this profile. Apply the latest public profile migrations and try again.",
        );
      } finally {
        if (active) setPublicProfileLoading(false);
      }
    };
    loadPublicProfile();

    return () => {
      active = false;
    };
  }, [selectedPublicUsername]);

  const openPublicProfile = useCallback((username) => {
    publicProfileReturnPath.current = "/people";
    setProfileSearchQuery("");
    setProfileSearchResults([]);
    navigateTo(`/user/${encodeURIComponent(username)}`);
  }, [navigateTo]);

  const returnFromPublicProfile = useCallback(() => {
    navigateTo(publicProfileReturnPath.current || "/");
  }, [navigateTo]);

  const copyPublicProfileLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedProfileLink(true);
      window.setTimeout(() => setCopiedProfileLink(false), 1800);
    } catch (error) {
      console.error("Could not copy the public profile link:", error);
      setPublicProfileError(
        "Could not copy the link. Copy the profile URL from your browser address bar.",
      );
    }
  }, []);

  return {
    copiedProfileLink,
    copyPublicProfileLink,
    dailyLogPage,
    navigateTo,
    openPublicProfile,
    peopleSearchError: profileSearchError,
    peopleSearchLoading: profileSearchLoading,
    peopleSearchPage,
    peopleSearchQuery: profileSearchQuery,
    peopleSearchResults: profileSearchResults,
    publicHeatmap,
    publicHeatmapYear,
    publicProfile,
    publicProfileError,
    publicProfileLoading,
    publicProfileReturnPath,
    returnFromPublicProfile,
    selectedPublicUsername,
    setDailyLogPage,
    setPeopleSearchQuery: setProfileSearchQuery,
    setPublicHeatmapYear,
    showProfile,
    showSettings,
  };
}
