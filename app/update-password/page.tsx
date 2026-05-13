import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `New password · ${SITE.name}`,
};

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">New password</h1>
        <p className="mt-2 text-sm text-white/55">Open the reset link from your email on this same device/browser.</p>
        <div className="mt-6">
          <UpdatePasswordForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
