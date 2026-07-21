import { LiveBadge } from "@/components/neya/live-badge";
import { Badge } from "@/components/ui/badge";
import { isEventLiveNow } from "@/lib/event-display";
import type { Event } from "@/types";

interface EventBadgesProps {
  event: Event;
  className?: string;
}

export function EventBadges({ event, className }: EventBadgesProps) {
  const live = isEventLiveNow(event);

  return (
    <div className={className}>
      <LiveBadge live={live} />
      {event.is_featured ? <Badge variant="neon">Featured</Badge> : null}
      {event.venue?.is_trending ? (
        <Badge variant="secondary" className="border-amber-400/30 text-amber-200">
          Trending
        </Badge>
      ) : null}
      <Badge variant="neon">{event.genre}</Badge>
      {event.is_hidden_premium ? (
        <Badge variant="secondary" className="border-fuchsia-500/40 text-fuchsia-200">
          Premium room
        </Badge>
      ) : null}
    </div>
  );
}
