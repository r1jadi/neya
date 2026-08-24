"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "ghost" | "secondary";
  className?: string;
  wrapperClassName?: string;
  /** Full-width row styled like mobile nav links */
  navStyle?: boolean;
};

function SignOutInner({ variant, className, navStyle }: Pick<Props, "variant" | "className" | "navStyle">) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  if (navStyle) {
    return (
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/5 disabled:opacity-50"
      >
        {pending ? t.auth.signingOut : t.auth.signOut}
      </button>
    );
  }
  return (
    <Button type="submit" variant={variant} disabled={pending} className={cn("w-full", className)}>
      {pending ? t.auth.signingOut : t.auth.signOut}
    </Button>
  );
}

export function SignOutButton({ variant = "ghost", className, wrapperClassName, navStyle }: Props) {
  return (
    <form action={signOut} className={wrapperClassName}>
      <SignOutInner variant={variant} className={className} navStyle={navStyle} />
    </form>
  );
}
