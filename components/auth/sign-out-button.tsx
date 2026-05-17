"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "ghost" | "secondary";
  className?: string;
  wrapperClassName?: string;
  /** Full-width row styled like mobile nav links */
  navStyle?: boolean;
};

export function SignOutButton({ variant = "ghost", className, wrapperClassName, navStyle }: Props) {
  if (navStyle) {
    return (
      <form action={signOut} className="w-full">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/5"
        >
          Sign out
        </button>
      </form>
    );
  }

  return (
    <form action={signOut} className={wrapperClassName}>
      <Button type="submit" variant={variant} className={cn("w-full", className)}>
        Sign out
      </Button>
    </form>
  );
}
