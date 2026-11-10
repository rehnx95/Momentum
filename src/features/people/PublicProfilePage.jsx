import { useState, useEffect, useMemo, useRef } from "react";
import { getLocalDateKey } from "../../shared/utils/date";
import AppHeader from "../../shared/components/AppHeader";
import Tooltip from "../../shared/components/Tooltip";
import { Calendar, Trophy, Target, Link2 } from "lucide-react";
import StatStrip from "../../shared/components/StatStrip";
import ActivityHeatmap from "../activity/components/ActivityHeatmap";
import { getLevel } from "../activity/utils/heatmap";

export default function PublicProfilePage({
  profile,
  loading,
  error,
  copied,
  onCopyLink,
  onBack,
  context,
}) {
    const {
      headerProps,
      publicHeatmap,
      publicHeatmapYear,
      publicProfileReturnPath,
      selectedPublicUsername,
      setPublicHeatmapYear,
      todayDateKey,
    } = context;
    const [dateKey, setDateKey] = useState(() => getLocalDateKey(new Date()));
    const activityScrollRef = useRef(null);
    useEffect(() => {
      const container = activityScrollRef.current;
      if (container) container.scrollLeft = container.scrollWidth;
    }, []);

    useEffect(() => {
      const refreshDate = () => {
        setDateKey((current) => {
          const today = getLocalDateKey(new Date());
          return current === today ? current : today;
        });
      };
      const timer = window.setInterval(refreshDate, 60_000);
      window.addEventListener("focus", refreshDate);
      document.addEventListener("visibilitychange", refreshDate);
      return () => {
        window.clearInterval(timer);
        window.removeEventListener("focus", refreshDate);
        document.removeEventListener("visibilitychange", refreshDate);
      };
    }, []);

    const activity = profile?.activity || {};
    const heatmapData = useMemo(() => {
      const [year, month, day] = dateKey.split("-").map(Number);
      const today = new Date(year, month - 1, day);
   const rangeStart = new Date(today);
rangeStart.setDate(rangeStart.getDate() - 364);
const start = new Date(rangeStart);
start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const weeks = [];
      for (let weekIndex = 0; weekIndex < 53; weekIndex++) {
        const week = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const date = new Date(start);
          date.setDate(start.getDate() + weekIndex * 7 + dayIndex);
          const dateKey = getLocalDateKey(date);
         const outOfRange = date < rangeStart || date > today;
          const count = outOfRange ? 0 : Number(activity[dateKey] || 0);
          week.push({
            date,
            dateKey,
            count,
            outOfRange,
            intensity: getLevel(count),
          });
        }
        weeks.push(week);
      }
      const monthLabels = weeks.map((week) => {
        const firstOfMonth = week.find(
          (item) => !item.outOfRange && item.date.getDate() === 1,
        );
        return firstOfMonth
          ? firstOfMonth.date.toLocaleDateString(undefined, { month: "short" })
          : "";
      });
      return { weeks, monthLabels };
    }, [activity, dateKey]);

    const customSheets = profile?.custom_sheets || [];
    const profileSheetStats = useMemo(() => {
      return customSheets.map((sheet, index) => ({
        id: `${sheet.title}-${index}`,
        title: sheet.title,
        solved: Number(sheet.solved || 0),
        skipped: Number(sheet.skipped || 0),
        total: Number(sheet.total || 0),
      }));
    }, [customSheets]);
    const recentAccepted = useMemo(() => {
      return (profile?.custom_recent_accepted || []).map(
        (problem, index) => ({
          id: `custom-${index}:${problem.sheet_title}:${problem.title}`,
          title: problem.title,
          sheetTitle: problem.sheet_title,
          acceptedOn: problem.accepted_on,
          completedAt: problem.completed_at,
        }),
      );
    }, [profile?.custom_recent_accepted]);
    const activeDays = heatmapData.weeks
      .flat()
      .filter((item) => !item.outOfRange && item.count > 0).length;
    const profileProblemsSolved = profileSheetStats.reduce(
      (total, sheet) => total + sheet.solved,
      0,
    );
    const profileProblemsTotal = profileSheetStats.reduce(
      (total, sheet) => total + sheet.total,
      0,
    );
    const solvedPastYear = heatmapData.weeks
      .flat()
      .filter((item) => !item.outOfRange)
      .reduce((total, item) => total + item.count, 0);

    return (
      <div className="profile-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans">
        <AppHeader
          active={publicProfileReturnPath.current === "/profile" ? "profile" : "people"}
          {...headerProps}
        />

        <main className="app-page">
          {error && !loading && !profile ? (
            <section className="surface-card rounded-2xl border p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted">
                {error === "This profile could not be found."
                  ? "404"
                  : "Profile"}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {error === "This profile could not be found."
                  ? "Profile not found"
                  : "Could not load profile"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#A1A1A1]">
                {error === "This profile could not be found."
                  ? "This username doesn’t match a public profile. Check the spelling or search for another user."
                  : error}
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-6 rounded-lg bg-[#EDEDED] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white"
              >
                Find people
              </button>
            </section>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-border-strong bg-rowHover p-4 text-sm text-muted"
            >
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="surface-card rounded-2xl border p-6 text-sm text-[#A1A1A1]">
              Loading profile…
            </div>
          ) : (
            profile && (
              <div className="profile-layout own-profile-layout public-profile-layout">
                <div className="profile-left-column">
                  <aside className="profile-sidebar">
                  <section className="profile-hero">
                    <div className="profile-avatar">
                      {(profile.name || profile.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="profile-user-details">
                      <div className="profile-identity">
                        <h1 className="text-2xl font-bold text-[#EDEDED]">
                          {profile.name || profile.username}
                        </h1>
                        <p className="mt-1 text-sm text-[#A1A1A1]">
                          @{profile.username}
                        </p>
                        {profile.location && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-[#A1A1A1]">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {profile.location}
                          </div>
                        )}
                        {profile.website && (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block break-all text-sm text-[#A1A1A1] hover:text-white hover:underline"
                          >
                            {profile.website}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="profile-hero-actions flex flex-wrap gap-2">
                      <Tooltip label={copied ? "Link copied" : "Share profile"}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={onCopyLink}
                          aria-label={copied ? "Profile link copied" : "Share profile"}
                        >
                          <Link2 size={16} />
                        </button>
                      </Tooltip>
                    </div>
                    <StatStrip
                      className="profile-overview-stats"
                      items={[
                        {
                          label: "Current streak",
                          value: Number(profile.current_streak || 0),
                          unit: Number(profile.current_streak || 0) === 1 ? "day" : "days",
                          icon: Calendar,
                        },
                        {
                          label: "Best streak",
                          value: Number(profile.longest_streak || 0),
                          unit: Number(profile.longest_streak || 0) === 1 ? "day" : "days",
                          icon: Trophy,
                        },
                        {
                          label: "Problems solved",
                          value: profileProblemsSolved,
                          unit: `/ ${profileProblemsTotal}`,
                          icon: Target,
                        },
                        {
                          label: "Active days",
                          value: activeDays,
                          icon: Calendar,
                        },
                      ]}
                    />
                  </section>
                  </aside>

                  <section
                    className="profile-sheet-progress surface-card rounded-2xl border border-[#262626] bg-[#0A0A0A] p-6"
                    aria-labelledby="public-profile-sheet-progress"
                  >
                    <header className="profile-progress-heading">
                      <h2
                        id="public-profile-sheet-progress"
                        className="text-lg font-semibold text-[#EDEDED]"
                      >
                        Sheet progress
                      </h2>
                    </header>
                    <div className="profile-sheet-grid">
                      {profileSheetStats.map((sheet) => {
                        const percentage = sheet.total
                          ? Math.round((sheet.solved / sheet.total) * 100)
                          : 0;
                        return (
                          <div className="profile-sheet-tile" key={sheet.id}>
                            <div className="profile-sheet-tile-heading">
                              <span className="truncate font-medium text-[#EDEDED]">
                                {sheet.title}
                              </span>
                              <span className="profile-sheet-percent">{percentage}%</span>
                            </div>
                            <div
                              className="profile-sheet-progress-track h-2 overflow-hidden rounded-full bg-[#262626]"
                              role="progressbar"
                              aria-label={`${sheet.title} progress`}
                              aria-valuemin={0}
                              aria-valuemax={sheet.total}
                              aria-valuenow={sheet.solved}
                            >
                              <div
                                className="profile-sheet-progress-fill h-full rounded-full bg-[#EDEDED] transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="profile-sheet-counts">
                              {sheet.solved} / {sheet.total} solved
                              <span aria-hidden="true"> · </span>
                              {sheet.skipped} skipped
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="profile-main">
                  <ActivityHeatmap
                    activity={publicHeatmap.username === selectedPublicUsername ? publicHeatmap.activity : {}}
                    years={publicHeatmap.years}
                    todayKey={todayDateKey}
                    selectedYear={publicHeatmapYear}
                    onSelectYear={setPublicHeatmapYear}
                    loading={
                      publicHeatmap.username !== selectedPublicUsername ||
                      publicHeatmap.year !== publicHeatmapYear
                    }
                  />

                  <section
                    className="recent-ac-card surface-card"
                    aria-labelledby="public-recent-ac-heading"
                  >
                  <div className="recent-ac-heading">
                    <div>
                      <h2 id="public-recent-ac-heading">Recent AC</h2>
                      <p>Latest accepted problems</p>
                    </div>
                    <span className="recent-ac-count">Latest {recentAccepted.length}</span>
                  </div>
                  {recentAccepted.length > 0 ? (
                    <>
                      <div className="recent-ac-columns" aria-hidden="true">
                        <span />
                        <span>Problem</span>
                        <span>Topic</span>
                        <span>Date</span>
                      </div>
                      <ul className="recent-ac-list">
                        {recentAccepted.map((problem) => (
                          <li key={problem.id} className="recent-ac-item">
                            <div className="recent-ac-check" aria-hidden="true">
                              ✓
                            </div>
                            <Tooltip label={problem.title} className="recent-ac-tooltip">
                              <p className="recent-ac-title" tabIndex={0}>
                                {problem.title}
                              </p>
                            </Tooltip>
                            <Tooltip label={problem.sheetTitle} className="recent-ac-tooltip">
                              <span className="recent-ac-topic" tabIndex={0}>
                                {problem.sheetTitle}
                              </span>
                            </Tooltip>
                            {problem.acceptedOn ? (
                              <time
                                className="recent-ac-date"
                                dateTime={problem.acceptedOn}
                              >
                                {new Date(
                                  `${problem.acceptedOn}T00:00:00`,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </time>
                            ) : (
                              <span className="recent-ac-date">
                                Date unavailable
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="recent-ac-empty">
                      Accepted problems will show here as they are solved.
                    </p>
                  )}
                  </section>
                </div>
              </div>
            )
          )}
        </main>
      </div>
    );
  }
