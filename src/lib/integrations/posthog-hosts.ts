export const ALLOWED_POSTHOG_HOSTS = [
  "https://us.posthog.com",
  "https://eu.posthog.com",
] as const;

export const ALLOWED_POSTHOG_HOST_SET = new Set<string>(ALLOWED_POSTHOG_HOSTS);
