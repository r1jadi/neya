import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/auth/require-admin";
import { listVenueAccounts } from "@/services/venue-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ accounts: [], error: "Unauthorized" }, { status: 401 });
  }

  const result = await listVenueAccounts();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
