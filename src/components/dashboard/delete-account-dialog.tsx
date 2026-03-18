"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteAccountDialog({ userEmail }: { userEmail: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const confirmed = confirmation === userEmail;

  async function handleDelete() {
    setDeleting(true);
    try {
      // Delete all user data via API
      const res = await fetch("/api/v1/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");

      // Delete better-auth user record
      await authClient.deleteUser();

      // Redirect to home
      router.push("/");
    } catch {
      setDeleting(false);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <PixelButton variant="danger">Delete Account</PixelButton>
      </AlertDialogTrigger>
      <AlertDialogContent
        className="border-2 border-brand bg-surface shadow-[6px_6px_0_var(--color-brand)] rounded-none max-w-md"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-[family-name:var(--font-press-start)] text-sm text-red-700">
            Delete Account
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-brand/70">
            This will permanently delete your account and all data including
            releases, templates, brands, and API keys. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label className="text-xs text-brand/60">
            Type <strong className="text-brand">{userEmail}</strong> to
            confirm
          </Label>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={userEmail}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="border-2 border-brand bg-white text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] rounded-none font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 transition-all"
            onClick={() => setConfirmation("")}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="border-2 border-red-700 bg-red-600 text-white shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] rounded-none font-[family-name:var(--font-press-start)] text-[10px] px-4 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0_var(--color-brand)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            disabled={!confirmed || deleting}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {deleting ? "Deleting..." : "Delete Forever"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
