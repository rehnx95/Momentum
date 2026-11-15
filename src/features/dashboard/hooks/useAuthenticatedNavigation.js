import { useCallback, useEffect, useRef, useState } from "react";

function getPageTitle(pathname = window.location.pathname) {
  if (pathname === "/") return "Dashboard • Momentum";
  if (pathname === "/daily-log") return "Daily Log • Momentum";
  if (pathname === "/people") return "People • Momentum";
  if (pathname === "/profile") return "Profile • Momentum";
  if (pathname === "/profile/edit") return "Edit Profile • Momentum";
  const profileMatch = pathname.match(/^\/(?:user|u)\/([A-Za-z0-9-]{3,48})\/?$/);
  if (profileMatch) return `${profileMatch[1]} • Momentum`;
  return "Momentum";
}

function applyRouteMetadata(pathname = window.location.pathname) {
  const title = getPageTitle(pathname);
  if (typeof document !== "undefined") {
    document.title = title;
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.setAttribute("name", "theme-color");
      document.head.appendChild(themeColor);
    }
    themeColor.setAttribute("content", "#000000");
  }
}

function getAuthenticatedRoute(pathname = window.location.pathname) {
  const profileMatch = pathname.match(/^\/(?:user|u)\/([A-Za-z0-9-]{3,48})\/?$/);
  const knownPaths = new Set(["/", "/daily-log", "/people", "/profile", "/profile/edit"]);
  const showProfile = pathname === "/profile" || pathname === "/profile/edit";
  const isKnownPath = knownPaths.has(pathname) || Boolean(profileMatch);

  return {
    dailyLogPage: pathname === "/daily-log",
    notFoundPage: !isKnownPath,
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
    const handlePopState = () => {
      const nextRoute = getAuthenticatedRoute();
      applyRouteMetadata(window.location.pathname);
      setRoute(nextRoute);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((path) => {
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    applyRouteMetadata(path);
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
