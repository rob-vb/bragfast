"use client";

import { createContext, useContext } from "react";

const UserIdContext = createContext<string | null>(null);

export const UserIdProvider = UserIdContext.Provider;

export function useUserId(): string {
  const userId = useContext(UserIdContext);
  if (!userId) throw new Error("useUserId must be used within UserIdProvider");
  return userId;
}
