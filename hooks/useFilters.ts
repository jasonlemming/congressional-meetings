"use client";

import { useMemo, useState } from "react";
import type { Meeting } from "./useMeetings";

type Filters = {
  chamber: "all" | "house" | "senate";
};

export function useFilters(meetings: Meeting[] | undefined | null) {
  const [filters, setFilters] = useState<Filters>({ chamber: "all" });

  const list: Meeting[] = Array.isArray(meetings) ? meetings : [];

  const filteredMeetings = useMemo(() => {
    return list.filter((m) => {
      if (filters.chamber !== "all" && m.chamber !== filters.chamber) return false;
      return true;
    });
  }, [list, filters]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return { filters, updateFilter, filteredMeetings };
}

