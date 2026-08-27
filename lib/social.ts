export type GroupableActivity = { object_type: "event" | "venue"; object_id: string | null; meta: Record<string, unknown>; actor: { id: string; display_name: string | null } };
export type GroupedSocialActivity = GroupableActivity & { people: { id: string; display_name: string | null }[] };

export function groupFriendActivity(items: GroupableActivity[]): GroupedSocialActivity[] {
  const groups = new Map<string, GroupedSocialActivity>();
  for (const item of items) {
    if (!item.object_id) continue;
    const key = `${item.object_type}:${item.object_id}`;
    const existing = groups.get(key);
    if (existing) {
      if (!existing.people.some((person) => person.id === item.actor.id)) existing.people.push(item.actor);
      continue;
    }
    groups.set(key, { ...item, people: [item.actor] });
  }
  return [...groups.values()];
}
