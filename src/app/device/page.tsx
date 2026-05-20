import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@convex/_generated/api";
import { PixelCard } from "@/components/admin/pixel-card";
import { ConvexClientProvider } from "@/components/convex-provider";
import { DeviceApproval } from "@/components/device/device-approval";
import { getSessionUser } from "@/lib/auth/get-session-user";

function recovery(message: string) {
  return (
    <main className="min-h-screen bg-bg px-4 py-12 text-brand">
      <div className="mx-auto max-w-xl">
        <PixelCard>
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
              CLI Login
            </h1>
            <p className="text-sm text-brand/70">{message}</p>
            <p className="text-sm font-bold">Run <code>brag login</code> again.</p>
          </div>
        </PixelCard>
      </div>
    </main>
  );
}

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code?.toUpperCase();
  if (!code) return recovery("Missing device code.");

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/device?code=${code}`)}`);
  }

  const state = await fetchQuery(api.deviceCodes.getByUserCode, { user_code: code });
  if (!state) return recovery("This device code is invalid.");
  if (state.status === "expired") return recovery("This device code has expired.");
  if (state.status === "consumed") return recovery("This device code has already been used.");
  if (state.status === "denied") return recovery("This device code was denied.");

  return (
    <ConvexClientProvider>
      <main className="min-h-screen bg-bg px-4 py-12 text-brand">
        <div className="mx-auto max-w-xl">
          <PixelCard>
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand">
                  Approve CLI Access
                </h1>
                <p className="text-sm text-brand/70">
                  Confirm this code matches your terminal.
                </p>
              </div>

              <div className="border-2 border-brand bg-gold/20 px-4 py-3 font-mono text-2xl font-bold tracking-widest text-brand">
                {state.user_code}
              </div>

              <div className="space-y-1 text-sm">
                <p className="font-bold">Signed in as</p>
                <p className="text-brand/70">{user.email ?? user.name ?? user._id}</p>
              </div>

              <DeviceApproval userCode={state.user_code} />
            </div>
          </PixelCard>
        </div>
      </main>
    </ConvexClientProvider>
  );
}
