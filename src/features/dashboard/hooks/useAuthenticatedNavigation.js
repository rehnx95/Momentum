import { useCallback, useEffect, useRef, useState } from "react";

function getAuthenticatedRoute(pathname = window.location.pathname) {
  const profileMatch = pathname.match(/^\/(?:user|u)\/([A-Za-z0-9-]{3,48})\/?$/);
  const showProfile = pathname === "/profile" || pathname === "/profile/edit";

  return {
    dailyLogPage: pathname === "/daily-log",
    peopleSearchPage: pathname === "/people",
    selectedPublicUsername: profileMatch ? profileMatch[1].toLowerCase() : "",
    showProfile,
    showSettings: pathname === "/profile/edit",
  };
}

export default function useAuthenticatedNavigation() {
  const [route, setRoute] = useState(() => getAuthenticatedRoute());
  const publicProfileReturnPath = useRef(
    getAuthenticatedRoute().peopleSearchPage ? "/people" : "/",
  );

  useEffect(() => {
    const handlePopState = () => setRoute(getAuthenticatedRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((path) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute(getAuthenticatedRoute(path));
  }, []);

  const openPublicProfile = useCallback(
    (username) => {
      publicProfileReturnPath.current = "/people";
      navigateTo(`/user/${encodeURIComponent(username)}`);
    },
    [navigateTo],
  );

  const returnFromPublicProfile = useCallback(() => {
    navigateTo(publicProfileReturnPath.current || "/");
  }, [navigateTo]);

  return {
    ...route,
    navigateTo,
    openPublicProfile,
    publicProfileReturnPath,
    returnFromPublicProfile,
  };
}
