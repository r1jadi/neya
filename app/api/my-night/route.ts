import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanForUser } from "@/services/my-night";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getActivePlanForUser(user.id);
  return NextResponse.json(plan ?? { planId: "", title: "My Night", stops: [] });
}
