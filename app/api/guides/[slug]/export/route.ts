import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGuideBySlug, userHasGuideAccess } from "@/services/guides";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";

  const supabase = await createClient();
  const guide = await getGuideBySlug(slug, supabase, { includeUnpublished: true });

  if (!guide) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPreview = guide.published;
  const hasAccess = user ? await userHasGuideAccess(guide.id, user.id, supabase) : false;

  if (!isPublicPreview && !hasAccess) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  if (format === "pdf") {
    const html = buildPdfHtml(guide);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${slug}-guide.html"`,
      },
    });
  }

  return NextResponse.json(guide, {
    headers: {
      "Content-Disposition": `attachment; filename="${slug}.json"`,
    },
  });
}

function buildPdfHtml(guide: Awaited<ReturnType<typeof getGuideBySlug>>) {
  if (!guide) return "";
  const days = guide.days ?? [];
  const dayHtml = days
    .map(
      (d) => `
    <h2>Day ${d.day_number}: ${d.title}</h2>
    ${d.description ? `<p>${d.description}</p>` : ""}
    <ol>
      ${(d.stops ?? [])
        .map(
          (s) => `<li><strong>${s.name}</strong> (${s.category})${s.description ? ` — ${s.description}` : ""}</li>`,
        )
        .join("")}
    </ol>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${guide.title}</title>
<style>body{font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem;color:#111}
h1{font-size:1.75rem}h2{margin-top:1.5rem;font-size:1.2rem}p{color:#444}@media print{body{margin:0}}</style>
</head><body>
<h1>${guide.title}</h1>
<p>${guide.description ?? ""}</p>
${dayHtml}
<p style="margin-top:2rem;font-size:12px;color:#888">NEYA Guides — print this page to save as PDF</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;
}
