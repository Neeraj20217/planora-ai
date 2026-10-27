"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readPlans, STORAGE_EVENT, type PlanStorage } from "./plans";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(STORAGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(STORAGE_EVENT, listener);
  };
}
// A primitive snapshot is referentially stable when storage has not changed.
function snapshot() {
  try {
    const storage = window.localStorage;
    const pairs: [string, string | null][] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith("planora:plan:"))
        pairs.push([key, storage.getItem(key)]);
    }
    return JSON.stringify(pairs.sort(([a], [b]) => a.localeCompare(b)));
  } catch {
    return "blocked";
  }
}
const serverSnapshot = () => "";

export function useSavedPlans() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => {
    if (!raw) return { ready: false, plans: [], warnings: [], error: "" };
    if (raw === "blocked")
      return {
        ready: true,
        plans: [],
        warnings: [],
        error:
          "Browser storage is unavailable. Enable storage for this site and reload; no data was changed.",
      };
    try {
      const pairs: [string, string | null][] = JSON.parse(raw);
      const map = new Map(pairs);
      const storage: PlanStorage = {
        length: pairs.length,
        key: (index) => pairs[index]?.[0] ?? null,
        getItem: (key) => map.get(key) ?? null,
        setItem: () => {
          throw new Error("Read-only snapshot");
        },
      };
      return { ready: true, ...readPlans(storage), error: "" };
    } catch (error) {
      return {
        ready: true,
        plans: [],
        warnings: [],
        error:
          error instanceof Error
            ? error.message
            : "Saved plans could not be read.",
      };
    }
  }, [raw]);
}
