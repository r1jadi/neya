"use client";

import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toggleFollowArtist } from "@/actions/artists";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowArtistButton({
  artistId,
  artistSlug,
  initialFollowing,
  className,
  compact,
}: {
  artistId: string;
  artistSlug: string;
  initialFollowing: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleToggle() {
    if (pending || inFlight.current) return;
    inFlight.current = true;
    const next = !following;
    setFollowing(next); // optimistic — no page jump, no waiting on the server
    startTransition(async () => {
      const formData = new FormData();
      formData.set("artist_id", artistId);
      formData.set("artist_slug", artistSlug);
      try {
        const result = await toggleFollowArtist(formData);
        setFollowing(result.following);
        // Sync server-rendered state (dashboard list, profile counts).
        router.refresh();
      } catch {
        // A guest redirect (NEXT_REDIRECT) navigates to /login; a real
        // failure just reverts the optimistic state.
        setFollowing(!next);
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant={following ? "secondary" : "default"}
      className={cn("gap-1.5", className)}
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      disabled={pending}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${artistSlug}` : `Follow ${artistSlug}`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {pending ? "…" : following ? "Following" : "Follow"}
    </Button>
  );
}
