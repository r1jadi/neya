"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  approveGuestlistRequest,
  approveGuestlistRequestAdmin,
  deleteGuestlistRequest,
  deleteGuestlistRequestAdmin,
  updateGuestlistRequestStatus,
  updateGuestlistRequestStatusAdmin,
} from "@/actions/guestlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guestlistStatusClass, guestlistStatusLabel } from "@/lib/guestlist/labels";
import type { AdminEventRow } from "@/services/admin";
import type { GuestlistRequestWithEvent } from "@/types/guestlist";
import { cn } from "@/lib/utils";

const STATUSES = ["", "pending", "approved", "rejected", "checked_in"] as const;

function eventTitle(r: GuestlistRequestWithEvent): string {
  const ev = r.events;
  if (Array.isArray(ev)) return ev[0]?.title ?? "Event";
  return ev?.title ?? "Event";
}

type Props = {
  requests: GuestlistRequestWithEvent[];
  events: AdminEventRow[];
  /** Admin CMS vs legacy business hub vs venue portal */
  variant?: "admin" | "business" | "venue";
};

export function GuestlistRequestsPanel({ requests: initialRequests, events, variant = "admin" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  useEffect(() => {
    if (searchParams.get("ok") !== "1") return;
    router.refresh();
  }, [searchParams, router]);
  const redirectPath =
    variant === "venue"
      ? "/venue/guestlists"
      : variant === "business"
        ? "/business/guestlists"
        : "/admin?tab=guestlists";
  const approveAction = variant === "admin" ? approveGuestlistRequestAdmin : approveGuestlistRequest;
  const updateAction = variant === "admin" ? updateGuestlistRequestStatusAdmin : updateGuestlistRequestStatus;
  const deleteAction = variant === "admin" ? deleteGuestlistRequestAdmin : deleteGuestlistRequest;
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (eventFilter && r.event_id !== eventFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (q) {
        const hay = `${r.full_name} ${r.phone} ${r.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, eventFilter, statusFilter, search]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Guestlist requests</h3>
          <p className="text-xs text-white/45">
            {requests.length} total · {pendingCount} pending review
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white"
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? guestlistStatusLabel(s) : "All statuses"}
            </option>
          ))}
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone"
          className="h-11"
        />
      </div>

      <ul className="space-y-2">
        {filtered.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{r.full_name}</p>
                <p className="text-xs text-white/50">
                  {eventTitle(r)} · party of {r.group_size}
                </p>
                <p className="mt-1 text-white/70">{r.phone}</p>
                {r.email ? <p className="text-xs text-white/45">{r.email}</p> : null}
                {r.notes ? <p className="mt-1 text-xs italic text-white/40">&ldquo;{r.notes}&rdquo;</p> : null}
                <p className="mt-1 text-[10px] text-white/30">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  guestlistStatusClass(r.status),
                )}
              >
                {guestlistStatusLabel(r.status)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "pending" ? (
                <form action={approveAction}>
                  <input type="hidden" name="request_id" value={r.id} />
                  <input type="hidden" name="redirect" value={redirectPath} />
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </form>
              ) : null}
              {r.status === "pending" || r.status === "approved" ? (
                <form action={updateAction}>
                  <input type="hidden" name="request_id" value={r.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <input type="hidden" name="redirect" value={redirectPath} />
                  <Button type="submit" size="sm" variant="secondary">
                    Reject
                  </Button>
                </form>
              ) : null}
              {r.status === "approved" ? (
                <form action={updateAction}>
                  <input type="hidden" name="request_id" value={r.id} />
                  <input type="hidden" name="status" value="checked_in" />
                  <input type="hidden" name="redirect" value={redirectPath} />
                  <Button type="submit" size="sm" variant="secondary">
                    Check in
                  </Button>
                </form>
              ) : null}
              <form action={deleteAction}>
                <input type="hidden" name="request_id" value={r.id} />
                <input type="hidden" name="redirect" value={redirectPath} />
                <Button type="submit" size="sm" variant="ghost" className="text-red-300">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
        {!filtered.length ? (
          <li className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-white/40">
            No requests match your filters.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
