/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as brands from "../brands.js";
import type * as crons from "../crons.js";
import type * as draftPushes from "../draftPushes.js";
import type * as drafts from "../drafts.js";
import type * as githubInstallations from "../githubInstallations.js";
import type * as githubRepoConfigs from "../githubRepoConfigs.js";
import type * as goalEmails from "../goalEmails.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as integrationSecrets from "../integrationSecrets.js";
import type * as integrations_ga4 from "../integrations/ga4.js";
import type * as integrations_githubStars from "../integrations/githubStars.js";
import type * as integrations_posthog from "../integrations/posthog.js";
import type * as integrations_stripe from "../integrations/stripe.js";
import type * as migrations from "../migrations.js";
import type * as milestoneHits from "../milestoneHits.js";
import type * as oauthState from "../oauthState.js";
import type * as planTiers from "../planTiers.js";
import type * as previewLimit from "../previewLimit.js";
import type * as pushFanout from "../pushFanout.js";
import type * as rateLimit from "../rateLimit.js";
import type * as refreshChannelsAction from "../refreshChannelsAction.js";
import type * as releases from "../releases.js";
import type * as routingDefaults from "../routingDefaults.js";
import type * as sousChef from "../sousChef.js";
import type * as stripe from "../stripe.js";
import type * as templates from "../templates.js";
import type * as triggerEvents from "../triggerEvents.js";
import type * as uploadTokens from "../uploadTokens.js";
import type * as uploads from "../uploads.js";
import type * as userProfiles from "../userProfiles.js";
import type * as verifyKey from "../verifyKey.js";
import type * as videoRender from "../videoRender.js";
import type * as videoRenderHelpers from "../videoRenderHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  brands: typeof brands;
  crons: typeof crons;
  draftPushes: typeof draftPushes;
  drafts: typeof drafts;
  githubInstallations: typeof githubInstallations;
  githubRepoConfigs: typeof githubRepoConfigs;
  goalEmails: typeof goalEmails;
  goals: typeof goals;
  http: typeof http;
  integrationSecrets: typeof integrationSecrets;
  "integrations/ga4": typeof integrations_ga4;
  "integrations/githubStars": typeof integrations_githubStars;
  "integrations/posthog": typeof integrations_posthog;
  "integrations/stripe": typeof integrations_stripe;
  migrations: typeof migrations;
  milestoneHits: typeof milestoneHits;
  oauthState: typeof oauthState;
  planTiers: typeof planTiers;
  previewLimit: typeof previewLimit;
  pushFanout: typeof pushFanout;
  rateLimit: typeof rateLimit;
  refreshChannelsAction: typeof refreshChannelsAction;
  releases: typeof releases;
  routingDefaults: typeof routingDefaults;
  sousChef: typeof sousChef;
  stripe: typeof stripe;
  templates: typeof templates;
  triggerEvents: typeof triggerEvents;
  uploadTokens: typeof uploadTokens;
  uploads: typeof uploads;
  userProfiles: typeof userProfiles;
  verifyKey: typeof verifyKey;
  videoRender: typeof videoRender;
  videoRenderHelpers: typeof videoRenderHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
