import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh the cached channel list for all enabled Buffer + Postiz integrations.
crons.daily(
  "channel-refresh: Buffer + Postiz",
  { hourUTC: 15, minuteUTC: 30 },
  internal.refreshChannelsAction.refreshAllChannels,
);

export default crons;
