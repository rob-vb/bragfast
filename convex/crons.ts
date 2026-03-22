import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up unclaimed demo releases older than 24h
crons.daily(
  "cleanup demo releases",
  { hourUTC: 4, minuteUTC: 0 },
  internal.releases.cleanupDemoReleases
);

// Clean up expired demo rate limit entries
crons.hourly(
  "cleanup demo rate limits",
  { minuteUTC: 30 },
  internal.demoRateLimits.cleanupExpired
);

export default crons;
