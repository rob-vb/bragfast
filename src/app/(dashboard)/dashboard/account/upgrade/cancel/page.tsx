import Link from "next/link";

export default function UpgradeCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-lg text-brand text-center">
        Checkout cancelled
      </h1>
      <p className="text-sm text-brand/70 text-center max-w-md">
        No worries — you can upgrade anytime from your account page.
      </p>
      <Link
        href="/dashboard/account/upgrade"
        className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
      >
        View Plans
      </Link>
    </div>
  );
}
