import { InvokeCommand, type InvokeCommandOutput } from "@aws-sdk/client-lambda";
import type { LambdaInput, LambdaResult } from "../pipeline/render-hyperframe";

type Sender = (cmd: InvokeCommand) => Promise<InvokeCommandOutput>;

export function makeInvokeHyperframesLambda(opts: {
  functionName: string;
  send: Sender;
}) {
  return async function invokeHyperframesLambda(input: LambdaInput): Promise<LambdaResult> {
    try {
      const cmd = new InvokeCommand({
        FunctionName: opts.functionName,
        Payload: new TextEncoder().encode(JSON.stringify(input)),
      });
      const out = await opts.send(cmd);
      const text = out.Payload ? new TextDecoder().decode(out.Payload) : "{}";
      const parsed = text ? JSON.parse(text) : {};

      if (out.FunctionError) {
        const reason = typeof parsed?.errorMessage === "string"
          ? parsed.errorMessage
          : `Lambda function error: ${out.FunctionError}`;
        return { ok: false, reason };
      }

      if (parsed?.ok === true && typeof parsed?.durationMs === "number") {
        return { ok: true, durationMs: parsed.durationMs };
      }

      const reason = typeof parsed?.reason === "string"
        ? parsed.reason
        : `Unexpected Lambda response: ${text.slice(0, 200)}`;
      return { ok: false, reason };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { ok: false, reason };
    }
  };
}
