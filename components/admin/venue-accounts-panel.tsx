"use client";

import { useState } from "react";
import {
  createVenueAccount,
  deactivateVenueAccount,
  deleteVenueAccount,
  sendVenueAccountPasswordReset,
  setVenueAccountPassword,
  updateVenueAccount,
} from "@/actions/admin-venue-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminVenueRow } from "@/services/admin";
import type { VenueAccountRow } from "@/types/auth";
import { cn } from "@/lib/utils";

type Props = {
  accounts: VenueAccountRow[];
  venues: AdminVenueRow[];
};

export function VenueAccountsPanel({ accounts, venues }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Create venue account</h2>
        <p className="mt-1 text-sm text-white/50">
          Partner accounts are provisioned by NEYA only. Assign a venue, then share login credentials privately.
        </p>
        <form action={createVenueAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input name="display_name" placeholder="Contact name" maxLength={120} />
          <Input name="email" type="email" placeholder="Email" required />
          <label className="text-xs text-white/60 sm:col-span-2">
            Linked venue
            <select
              name="venue_id"
              required
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
            >
              <option value="">Select venue…</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {!v.approved ? "(pending)" : ""}
                </option>
              ))}
            </select>
          </label>
          <Input name="password" type="password" placeholder="Temporary password (optional, min 8)" minLength={8} />
          <Button type="submit" className="sm:col-span-2">
            Create account
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Venue accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-white/45">No venue partner accounts yet.</p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((a) => {
              const venueName = Array.isArray(a.venues) ? a.venues[0]?.name : a.venues?.name;
              const isEditing = editingId === a.id;

              return (
                <li key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{a.display_name ?? a.email}</p>
                      <p className="text-xs text-white/45">{a.email}</p>
                      <p className="mt-1 text-xs text-white/55">
                        {venueName ?? "No venue"} ·{" "}
                        <span className={cn(a.account_active ? "text-emerald-300" : "text-amber-300")}>
                          {a.account_active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingId(isEditing ? null : a.id)}>
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <form action={updateVenueAccount} className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                      <input type="hidden" name="user_id" value={a.id} />
                      <Input name="display_name" defaultValue={a.display_name ?? ""} placeholder="Name" />
                      <label className="text-xs text-white/60 sm:col-span-2">
                        Venue
                        <select
                          name="venue_id"
                          required
                          defaultValue={a.venue_id ?? ""}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                        >
                          {venues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white/70">
                        <input type="checkbox" name="account_active" defaultChecked={a.account_active} />
                        Account active
                      </label>
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                    </form>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <form action={sendVenueAccountPasswordReset}>
                      <input type="hidden" name="email" value={a.email} />
                      <Button type="submit" size="sm" variant="secondary">
                        Send reset link
                      </Button>
                    </form>
                    <form action={setVenueAccountPassword} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="user_id" value={a.id} />
                      <Input name="password" type="password" placeholder="New temp password" minLength={8} className="h-8 w-40 text-xs" />
                      <Button type="submit" size="sm" variant="secondary">
                        Set password
                      </Button>
                    </form>
                    {!a.account_active ? null : (
                      <form action={deactivateVenueAccount}>
                        <input type="hidden" name="user_id" value={a.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Deactivate
                        </Button>
                      </form>
                    )}
                    <form action={deleteVenueAccount}>
                      <input type="hidden" name="user_id" value={a.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
