import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { getOfflineMutations } from "../../../shared/lib/offlineMutationStore";
import { queueOfflineMutation, syncOfflineMutations } from "../../../shared/lib/offlineSync";
import { getActivityKey, isActivityColorValue } from "../lib/activityColor";

function getColorCacheKey(userId) {
  return `momentum:activity-colors:${userId}`;
}

function readColorCache(userId) {
  try {
    const stored = localStorage.getItem(getColorCacheKey(userId));
    const colors = stored ? JSON.parse(stored) : {};
    return colors && typeof colors === "object" && !Array.isArray(colors) ? colors : {};
  } catch (error) {
    console.warn("Could not read saved activity colors:", error);
    return {};
  }
}

function writeColorCache(userId, colors) {
  try {
    localStorage.setItem(getColorCacheKey(userId), JSON.stringify(colors));
  } catch (error) {
    console.warn("Could not save activity colors on this device:", error);
  }
}

export default function useActivityColors(userId, onError) {
  const [activityColors, setActivityColors] = useState(() => readColorCache(userId));

  const reportError = useCallback(
    (message, error) => {
      console.error(message, error);
      const details =
        error && typeof error === "object"
          ? [error.message, error.code].filter((value) => typeof value === "string").join(" ")
          : "";
      onError?.(details ? `${message} ${details}` : message);
    },
    [onError],
  );

  const refresh = useCallback(async () => {
    await syncOfflineMutations(userId);
    const { data, error } = await supabase
      .from("activity_color_assignments")
      .select("activity_key, color")
      .eq("user_id", userId);
    if (error) throw error;

    const colors = Object.fromEntries(
      (data || []).map(({ activity_key, color }) => [activity_key, color]),
    );
    const pendingMutations = await getOfflineMutations(userId);
    for (const mutation of pendingMutations) {
      if (mutation.type === "activity-color") {
        colors[getActivityKey(mutation.payload.activityName)] = mutation.payload.color;
      }
    }
    writeColorCache(userId, colors);
    return colors;
  }, [userId]);

  useEffect(() => {
    let active = true;
    setActivityColors(readColorCache(userId));
    refresh()
      .then((colors) => {
        if (active) setActivityColors(colors);
      })
      .catch((error) => {
        if (active) reportError("Could not load activity colors:", error);
      });

    return () => {
      active = false;
    };
  }, [refresh, reportError, userId]);

  const assignColor = useCallback(
    async (name) => {
      if (getActivityKey(name) === "sleep") return "sleep";
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return activityColors[getActivityKey(name)] || null;
      }
      try {
        const { data, error } = await supabase.rpc("get_or_assign_activity_color", {
          p_activity_name: name,
        });
        if (error) throw error;
        if (!isActivityColorValue(data)) {
          reportError("The activity color service returned an invalid color:", data);
          return null;
        }
        const nextColors = { ...activityColors, [getActivityKey(name)]: data };
        setActivityColors(nextColors);
        writeColorCache(userId, nextColors);
        return data;
      } catch (error) {
        reportError("Could not assign an activity color:", error);
        return null;
      }
    },
    [activityColors, reportError, userId],
  );

  const setColor = useCallback(
    async (name, color) => {
      if (!isActivityColorValue(color) || getActivityKey(name) === "sleep") return false;
      const colorValue = color.toLowerCase();
      const activityKey = getActivityKey(name);
      const nextColors = { ...activityColors, [activityKey]: colorValue };
      setActivityColors(nextColors);
      writeColorCache(userId, nextColors);
      try {
        const mutation = await queueOfflineMutation({
          userId,
          type: "activity-color",
          entityId: activityKey,
          payload: { activityName: name, color: colorValue },
        });
        const result = await syncOfflineMutations(userId);
        const failure = result.failures.find(
          (item) => item.key === mutation.key && !item.retryable,
        );
        if (failure) reportError("Could not sync the activity color:", new Error(failure.message));
        return true;
      } catch (error) {
        reportError("Could not save the activity color:", error);
        return false;
      }
    },
    [activityColors, reportError, userId],
  );

  return { activityColors, assignColor, setColor };
}
