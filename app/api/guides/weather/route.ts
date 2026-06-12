import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Mock weather widget — replace with OpenWeatherMap when API key is available */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "Prishtina";

  const month = new Date().getMonth();
  const seasonal =
    month >= 5 && month <= 8
      ? { temp: 28, description: "Warm and sunny", icon: "☀️" }
      : month >= 11 || month <= 1
        ? { temp: 4, description: "Cold, possible snow in mountains", icon: "❄️" }
        : { temp: 18, description: "Mild, great for walking", icon: "⛅" };

  return NextResponse.json({
    city,
    ...seasonal,
    source: "mock",
  });
}
