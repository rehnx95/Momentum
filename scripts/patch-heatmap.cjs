const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "src", "App.jsx");
let app = fs.readFileSync(appPath, "utf8");

if (app.includes("ActivityHeatmap")) {
  console.log("Already patched.");
  process.exit(0);
}

function fail(msg) {
  console.error("\nPatch aborted, nothing was written:\n  " + msg);
  process.exit(1);
}

// 1. import
const importRe = /import ProfileSettings from ["']\.\/components\/ProfileSettings["'];/;
if (!importRe.test(app)) fail("Could not find the ProfileSettings import line.");
app = app.replace(
  importRe,
  (m) => m + '\nimport ActivityHeatmap from "./components/ActivityHeatmap";',
);

// 2. state + public activity loader
const stateRe = /const \[copiedProfileLink, setCopiedProfileLink\] = useState\(false\);/;
if (!stateRe.test(app)) fail("Could not find the copiedProfileLink state line.");
const hooks = `
  const [ownHeatmapYear, setOwnHeatmapYear] = useState(null);
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
`;
app = app.replace(stateRe, (m) => m + "\n" + hooks);

// 3. own profile heatmap block
const ownStart = app.indexOf("{/* Activity Section */}");
const ownLabel = app.indexOf('aria-labelledby="recent-ac-heading"');
if (ownStart === -1 || ownLabel === -1) fail("Could not find the own-profile heatmap block.");
const ownEnd = app.lastIndexOf("<section", ownLabel);
if (ownEnd <= ownStart || !app.slice(ownStart, ownEnd).includes("activity-heatmap")) {
  fail("Own-profile heatmap block looks different than expected.");
}
const ownNew = `{/* Activity Section */}
              <ActivityHeatmap
                activity={activityLog}
                todayKey={todayDateKey}
                selectedYear={ownHeatmapYear}
                onSelectYear={setOwnHeatmapYear}
              />

              `;
app = app.slice(0, ownStart) + ownNew + app.slice(ownEnd);

// 4. public profile heatmap block
const pubLabel = app.indexOf('aria-labelledby="public-recent-ac-heading"');
if (pubLabel === -1) fail("Could not find the public-profile Recent AC section.");
const pubEnd = app.lastIndexOf("<section", pubLabel);
const pubStart = app.lastIndexOf("<section", pubEnd - 1);
if (pubStart === -1 || !app.slice(pubStart, pubEnd).includes("activity-heatmap")) {
  fail("Public-profile heatmap block looks different than expected.");
}
const pubNew = `<ActivityHeatmap
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

                `;
app = app.slice(0, pubStart) + pubNew + app.slice(pubEnd);

fs.writeFileSync(appPath, app);
console.log("Done. Heatmap patched on both the own and public profile.");
