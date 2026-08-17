"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button with a built-in pending state for server-action forms.
 * Shows a spinner while the action is in flight and blocks double submits.
 */
export function SubmitButton({
  children,
  pendingText = "Please wait…",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={cn(className)} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
