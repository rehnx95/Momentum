import { useState } from "react";
import { Database, Trash2 } from "lucide-react";
import Tooltip from "../../../shared/components/Tooltip";
import seedSampleData, { removeSampleData } from "../lib/seedSampleData";
import "./SampleDataTools.css";

export default function SampleDataTools({ userId, userEmail, sheets }) {
  const [busyAction, setBusyAction] = useState("");
  const [status, setStatus] = useState("");
  const [hasError, setHasError] = useState(false);

  const runAction = async (action) => {
    const account = userEmail || "the current account";
    const message = action === "generate"
      ? `Generate sample data for ${account}? Matching Daily Log and problem records may be overwritten. Verify this is your second Google account before continuing.`
      : `Remove ALL Daily Log entries, problem progress, and activity history for ${account}? This also clears manually entered tracking data. Profile details and learning sheets will remain. Continue only for your test account.`;
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setBusyAction(action);
    setStatus("");
    setHasError(false);
    try {
      if (action === "generate") {
        const summary = await seedSampleData({ userId, sheets });
        setStatus(
          `Created ${summary.dailyLogDays} Daily Log days and ${summary.solvedProblems} solved problems across ${summary.activeSolveDays} dates. Reloading…`,
        );
      } else {
        await removeSampleData({ userId });
        setStatus("Removed this account's tracking data. Reloading…");
      }
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      console.error("Could not complete the sample data action:", error);
      setHasError(true);
      setStatus(
        `Could not complete the sample data action: ${
          error instanceof Error ? error.message : "Unexpected error."
        } Retry is safe if some rows were written.`,
      );
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="sample-data-tools">
      <Tooltip label="Generate sample data">
        <button
          type="button"
          className="sample-data-generate"
          aria-label="Generate sample data"
          onClick={() => void runAction("generate")}
          disabled={Boolean(busyAction)}
        >
          <Database size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip label="Remove sample data">
        <button
          type="button"
          className="sample-data-remove"
          aria-label="Remove sample data"
          onClick={() => void runAction("remove")}
          disabled={Boolean(busyAction)}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      {status && <span className="sample-data-status" role={hasError ? "alert" : "status"}>{status}</span>}
    </div>
  );
}
