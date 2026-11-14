import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { getActivityKey, isActivityColorValue } from "../lib/activityColor";

export default function useActivityColors(userId, onError) {
  const [activityColors, setActivityColors] = useState({});

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
    const { data, error } = await supabase
      .from("activity_color_assignments")
      .select("activity_key, color")
      .eq("user_id", userId);
    if (error) throw error;

    return Object.fromEntries((data || []).map(({ activity_key, color }) => [activity_key, color]));
  }, [userId]);

  useEffect(() => {
    let active = true;
    setActivityColors({});
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
  }, [refresh, reportError]);

  const assignColor = useCallback(
    async (name) => {
      if (getActivityKey(name) === "sleep") return "sleep";
      try {
        const { data, error } = await supabase.rpc("get_or_assign_activity_color", {
          p_activity_name: name,
        });
        if (error) throw error;
        if (!isActivityColorValue(data)) {
          reportError("The activity color service returned an invalid color:", data);
          return null;
        }
        setActivityColors((current) => ({ ...current, [getActivityKey(name)]: data }));
        return data;
      } catch (error) {
        reportError("Could not assign an activity color:", error);
        return null;
      }
    },
    [reportError],
  );

  const setColor = useCallback(
    async (name, color) => {
      if (!isActivityColorValue(color) || getActivityKey(name) === "sleep") return false;
      try {
        const { error } = await supabase.rpc("set_activity_color", {
          p_activity_name: name,
          p_color: color.toLowerCase(),
        });
        if (error) throw error;
        setActivityColors((current) => ({
          ...current,
          [getActivityKey(name)]: color.toLowerCase(),
        }));
        return true;
      } catch (error) {
        reportError("Could not save the activity color:", error);
        return false;
      }
    },
    [reportError],
  );

  return { activityColors, assignColor, setColor };
}
