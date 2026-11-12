import { supabase } from "../../../shared/lib/supabase";
import { clearDailyLogCaches } from "../../daily-log/lib/dailyLogHistoryCache";
import { buildSampleData } from "./sampleData";
import { isTestDataToolsEnabled } from "./testDataMode";

const BATCH_SIZE = 200;

function assertTestMode() {
  if (!isTestDataToolsEnabled) {
    throw new Error("Sample data actions are available only in enabled test mode.");
  }
  if (!supabase) {
    throw new Error("Supabase is not configured for the current project.");
  }
}

async function assertCurrentUser(userId) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not verify the current session: ${error.message}`);
  if (!data.session?.user?.id || data.session.user.id !== userId) {
    throw new Error("Sign in to the intended account before using these actions.");
  }
}

async function upsertRows(table, rows, conflictTarget) {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictTarget });
    if (error) {
      throw new Error(`Could not seed ${table}: ${error.message}`);
    }
  }
}

export default async function seedSampleData({ userId, sheets }) {
  assertTestMode();
  await assertCurrentUser(userId);
  const sample = buildSampleData({ userId, sheets });
  await upsertRows("daily_logs", sample.dailyLogs, "user_id,date");
  await upsertRows("progress", sample.progress, "user_id,problem_id");
  await upsertRows("activity_log", sample.activityLog, "user_id,date");
  clearDailyLogCaches(userId);

  return sample.summary;
}

export async function removeSampleData({ userId }) {
  assertTestMode();
  await assertCurrentUser(userId);
  for (const table of ["daily_logs", "progress", "activity_log"]) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      throw new Error(`Could not remove ${table} data: ${error.message}`);
    }
  }
  clearDailyLogCaches(userId);
}
