import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Sous-Chef daily milestone scans.
//
// Staggered by 5-minute offsets so we don't hammer one provider in a burst if the
// analysis happens to spike CPU. Each scanAll fans out per-user via scheduler.runAfter
// so one user's auth error does not block siblings.
const crons = cronJobs();

crons.daily(
  "sous-chef: Stripe MRR scan",
  { hourUTC: 15, minuteUTC: 0 },
  internal.integrations.stripe.scanAll,
);

crons.daily(
  "sous-chef: PostHog visitors scan",
  { hourUTC: 15, minuteUTC: 5 },
  internal.integrations.posthog.scanAll,
);

crons.daily(
  "sous-chef: GA4 visitors scan",
  { hourUTC: 15, minuteUTC: 7 },
  internal.integrations.ga4.scanAll,
);

crons.daily(
  "sous-chef: GitHub stars scan",
  { hourUTC: 15, minuteUTC: 10 },
  internal.integrations.githubStars.scanAll,
);

// Refresh the cached channel list for all enabled Buffer + Postiz integrations.
// Staggered 15 minutes after the sous-chef scans to avoid a CPU spike.
crons.daily(
  "channel-refresh: Buffer + Postiz",
  { hourUTC: 15, minuteUTC: 30 },
  internal.refreshChannelsAction.refreshAllChannels,
);

export default crons;
