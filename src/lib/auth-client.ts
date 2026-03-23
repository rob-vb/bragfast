import { createAuthClient } from "better-auth/react";
import { getSiteUrl } from "./site-url";

export const authClient = createAuthClient({
  baseURL: getSiteUrl(),
});
