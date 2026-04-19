import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// First cron in the project. Daily draft-generation for agent-drafted
// brag posts. v1 founder-only; fanout across users happens inside
// runDailyDraftJob when the FOUNDER_USER_ID gate is removed.
const crons = cronJobs();

crons.daily(
  "draft-brag-posts",
  { hourUTC: 15, minuteUTC: 0 }, // ~08:00 PT / 17:00 CET — user-timezone config deferred to v1.1
  internal.draftsActions.runDailyDraftJob,
);

export default crons;
