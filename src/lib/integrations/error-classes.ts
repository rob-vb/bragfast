/**
 * Push error taxonomy for the posting backbone.
 *
 * errorClass determines retry policy in pushFanout:
 *  - transient / rate_limit  → retryable (up to 3 attempts, exponential backoff)
 *  - auth / channel_gone / media / unknown → non-retryable, finalize as failed
 */

export type ErrorClass =
  | "auth"
  | "channel_gone"
  | "rate_limit"
  | "media"
  | "transient"
  | "unknown";

export class PushError extends Error {
  readonly class: ErrorClass;

  constructor(errorClass: ErrorClass, message: string) {
    super(message);
    this.name = "PushError";
    this.class = errorClass;
  }
}
