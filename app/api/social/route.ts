import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listFriendships, listGroupNightInvites, listVisibleFriendActivity, searchPublicUsers } from "@/services/social";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const search = params.get("search")?.trim();
  if (search) return NextResponse.json({ users: await searchPublicUsers(client, user.id, search) });
  const [friendships, activity, groupInvites] = await Promise.all([listFriendships(client, user.id), listVisibleFriendActivity(client, user.id), listGroupNightInvites(client, user.id)]);
  return NextResponse.json({ friendships, activity, groupInvites });
}
