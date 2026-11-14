import { useState, useEffect, useMemo } from "react";
import { getLocalDateKey } from "../../shared/utils/date";
import AppHeader from "../../shared/components/AppHeader";
import Tooltip from "../../shared/components/Tooltip";
import { Calendar, Trophy, Target, Link2 } from "lucide-react";
import StatStrip from "../../shared/components/StatStrip";
import ActivityHeatmap from "../activity/components/ActivityHeatmap";
import { getLevel } from "../activity/utils/heatmap";
import ProfileSheetProgress from "../profile/components/ProfileSheetProgress";

const EMPTY_ACTIVITY = {};
const EMPTY_SHEETS = [];
const EMPTY_RECENT_ACCEPTED = [];

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

  const activity = profile?.activity || EMPTY_ACTIVITY;
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
        const dayKey = getLocalDateKey(date);
        const outOfRange = date < rangeStart || date > today;
        const count = outOfRange ? 0 : Number(activity[dayKey] || 0);
        week.push({
          date,
          dateKey: dayKey,
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

  const customSheets = profile?.custom_sheets || EMPTY_SHEETS;
  const profileSheetStats = useMemo(
    () => customSheets.map((sheet, index) => ({
      id: `${sheet.title}-${index}`,
      title: sheet.title,
      solved: Number(sheet.solved || 0),
      skipped: Number(sheet.skipped || 0),
      total: Number(sheet.total || 0),
    })),
    [customSheets],
  );
  const recentAccepted = useMemo(
    () => (profile?.custom_recent_accepted || EMPTY_RECENT_ACCEPTED).map(
      (problem, index) => ({
        id: `custom-${index}:${problem.sheet_title}:${problem.title}`,
        title: problem.title,
        sheetTitle: problem.sheet_title,
        acceptedOn: problem.accepted_on,
        completedAt: problem.completed_at,
      }),
    ),
    [profile?.custom_recent_accepted],
  );
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
                        {profile.email && (
                          <p className="mt-1 break-all text-sm text-[#A1A1A1]">
                            {profile.email}
                          </p>
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

                <ProfileSheetProgress
                  sheets={profileSheetStats}
                  headingId="public-profile-sheet-progress"
                />
              </div>

              <div className="profile-main">
                <ActivityHeatmap
                  activity={publicHeatmap.username === selectedPublicUsername ? publicHeatmap.activity : {}}
                  years={publicHeatmap.years}
                  todayKey={todayDateKey}
                  selectedYear={publicHeatmapYear}
                  onSelectYear={setPublicHeatmapYear}
                  fillWidth
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
                    <h2 id="public-recent-ac-heading">Recent AC</h2>
                    <span className="recent-ac-count">Latest {recentAccepted.length}</span>
                  </div>
                  {recentAccepted.length > 0 ? (
                    <>
                      <div className="recent-ac-columns" aria-hidden="true">
                        <span />
                        <span>Problem</span>
                        <span>Sheet</span>
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
