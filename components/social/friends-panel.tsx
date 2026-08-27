"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock3, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFriendRequest, respondToFriendRequest, removeFriend } from "@/actions/social";
import type { FriendRequest, PublicSocialProfile, SocialActivity } from "@/services/social";

type SocialData = { friendships: FriendRequest[]; activity: SocialActivity[] };

export function FriendsPanel() {
  const [data, setData] = useState<SocialData>({ friendships: [], activity: [] });
  const [users, setUsers] = useState<PublicSocialProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch("/api/social", { cache: "no-store" }); const body = await response.json() as SocialData & { error?: string }; if (!response.ok) throw new Error(body.error); setData({ friendships: body.friendships ?? [], activity: body.activity ?? [] }); }
    catch { setError("Could not load your social activity."); } finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  async function search(value: string) {
    setQuery(value); if (!value.trim()) { setUsers([]); return; }
    setSearching(true);
    try { const response = await fetch(`/api/social?search=${encodeURIComponent(value)}`, { cache: "no-store" }); const body = await response.json() as { users?: PublicSocialProfile[] }; setUsers(response.ok ? body.users ?? [] : []); } finally { setSearching(false); }
  }
  async function mutate(action: Promise<{ ok: boolean }>) { const result = await action; if (!result.ok) setError("That action could not be completed."); else await load(); }

  const accepted = data.friendships.filter((friendship) => friendship.status === "accepted");
  const incoming = data.friendships.filter((friendship) => friendship.status === "pending");
  return <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Social Night</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">Go out together.</h1><p className="mt-2 text-sm text-white/55">Find friends, see who’s going out, and keep the night moving.</p></div>{error ? <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><UserPlus className="h-5 w-5 text-sky-300" /> Find people</h2><input value={query} onChange={(event) => void search(event.target.value)} placeholder="Search by display name" className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35" />{query ? <div className="mt-3 space-y-2">{searching ? <p className="text-sm text-white/50">Searching…</p> : users.length ? users.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5"><span className="font-medium text-white">{person.display_name ?? "NEYA member"}</span><Button size="sm" onClick={() => void mutate(sendFriendRequest(person.id))}>Add friend</Button></div>) : <p className="text-sm text-white/50">No matching public profiles.</p>}</div> : null}</section><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Clock3 className="h-5 w-5 text-amber-300" /> Requests</h2>{loading ? <p className="mt-4 text-sm text-white/50">Loading requests…</p> : incoming.length ? <div className="mt-4 space-y-2">{incoming.map((request) => <div key={request.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 p-3"><span className="text-sm text-white">Someone sent you a request</span><div className="flex gap-1"><Button size="sm" onClick={() => void mutate(respondToFriendRequest(request.id, "accept"))}><Check className="h-3.5 w-3.5" /></Button><Button size="sm" variant="secondary" onClick={() => void mutate(respondToFriendRequest(request.id, "decline"))}><X className="h-3.5 w-3.5" /></Button></div></div>)}</div> : <p className="mt-4 text-sm text-white/50">No pending requests.</p>}</section><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Users className="h-5 w-5 text-emerald-300" /> Friends ({accepted.length})</h2>{loading ? <p className="mt-4 text-sm text-white/50">Loading friends…</p> : accepted.length ? <div className="mt-4 space-y-2">{accepted.map((friendship) => <div key={friendship.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 p-3"><span className="text-sm text-white">Friend connection</span><Button size="sm" variant="secondary" onClick={() => void mutate(removeFriend(friendship.id))}>Remove</Button></div>)}</div> : <p className="mt-4 text-sm text-white/50">No friends yet. Find someone to start your Social Night.</p>}</section></div><section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"><h2 className="text-lg font-semibold text-white">Friends going out</h2>{data.activity.length ? <div className="mt-4 space-y-2">{data.activity.map((activity) => <Link key={activity.id} href={activity.object_id ? activity.object_type === "event" ? `/events/${activity.meta.slug ?? activity.object_id}` : `/venues/${activity.meta.slug ?? activity.object_id}` : "#"} className="block rounded-xl border border-white/10 p-3 transition hover:border-sky-400/40"><p className="text-sm text-white"><span className="font-semibold">{activity.actor.display_name ?? "A friend"}</span> {activity.verb.replace(/_/g, " ")}</p><p className="mt-1 text-xs text-white/45">{new Date(activity.created_at).toLocaleString("en-GB")}</p></Link>)}</div> : <p className="mt-4 text-sm text-white/50">Your friends’ public activity will appear here.</p>}</section></main>;
}
