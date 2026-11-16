const routeLoaders = {
  "/profile/edit": () => import("../../features/profile/pages/ProfileSettings"),
  "/profile": () => import("../../features/profile/pages/ProfilePage"),
  "/people": () => import("../../features/people/PeopleSearchPage"),
  "/daily-log": () => import("../../features/daily-log/components/DailyTracker"),
};
const publicProfileLoader = () => import("../../features/people/PublicProfilePage");

function hasCachedAccount() {
  try {
    return Boolean(localStorage.getItem("momentum:account-cache"));
  } catch {
    return false;
  }
}

function safe(loader) {
  loader().catch(() => {});
}

export function preconnectBackend() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

export function preloadForPath(pathname) {
  if (!hasCachedAccount()) return;
  safe(() => import("../../features/dashboard/AuthenticatedApp"));
  if (routeLoaders[pathname]) safe(routeLoaders[pathname]);
  else if (/^\/(?:user|u)\/[A-Za-z0-9-]{3,48}\/?$/.test(pathname)) safe(publicProfileLoader);
}
