"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

type State = "idle" | "approving" | "denying" | "approved" | "denied" | "error";

export function DeviceApproval({ userCode }: { userCode: string }) {
  const approve = useMutation(api.deviceCodes.approveCode);
  const deny = useMutation(api.deviceCodes.denyCode);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function handleApprove() {
    setState("approving");
    setError("");
    const result = await approve({ user_code: userCode });
    if (result.ok) {
      setState("approved");
      return;
    }
    setError(`Could not approve: ${result.error}`);
    setState("error");
  }

  async function handleDeny() {
    setState("denying");
    setError("");
    const result = await deny({ user_code: userCode });
    if (result.ok) {
      setState("denied");
      return;
    }
    setError(`Could not deny: ${result.error}`);
    setState("error");
  }

  if (state === "approved") {
    return (
      <p className="text-sm font-bold text-green-700">
        CLI access approved. Return to your terminal.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm font-bold text-red-700">
        CLI access denied. Return to your terminal.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleApprove}
          disabled={state === "approving" || state === "denying"}
          className="bg-gold text-brand border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
        >
          {state === "approving" ? "Approving..." : "Approve CLI Access"}
        </button>
        <button
          type="button"
          onClick={handleDeny}
          disabled={state === "approving" || state === "denying"}
          className="border-2 border-brand px-4 py-2.5 font-mono text-xs uppercase tracking-widest font-bold text-brand shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
        >
          {state === "denying" ? "Denying..." : "Deny"}
        </button>
      </div>
    </div>
  );
}
