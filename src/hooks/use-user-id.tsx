"use client";

import { createContext, useContext, type ReactNode } from "react";

const UserIdContext = createContext<string | null>(null);

export function UserIdProvider({ value, children }: { value: string; children: ReactNode }) {
  return <UserIdContext.Provider value={value}>{children}</UserIdContext.Provider>;
}

export function useUserId(): string {
  const userId = useContext(UserIdContext);
  if (!userId) throw new Error("useUserId must be used within UserIdProvider");
  return userId;
}
