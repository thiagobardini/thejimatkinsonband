"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { watchEventAttendance, type AttendanceSnapshot } from "@/lib/event-attendance-refresh";

const AttendanceContext = createContext<AttendanceSnapshot | null>(null);

export function EventAttendanceProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<AttendanceSnapshot | null>(null);
  useEffect(() => watchEventAttendance(setCounts), []);
  return <AttendanceContext value={counts}>{children}</AttendanceContext>;
}

export function useEventAttendance(id: string) {
  return useContext(AttendanceContext)?.[id];
}
