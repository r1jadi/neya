"use client";

import { useEffect, useState } from "react";
import { Cloud, Sun, Wallet, Calendar, Clock } from "lucide-react";
import type { Guide } from "@/types/guides";
import { GlassCard } from "@/components/neya/glass-card";

interface GuideSmartWidgetsProps {
  guide: Guide;
}

type WeatherData = {
  temp: number;
  description: string;
  icon: string;
};

export function GuideSmartWidgets({ guide }: GuideSmartWidgetsProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch("/api/guides/weather?city=Prishtina")
      .then((r) => r.json())
      .then((d) => setWeather(d))
      .catch(() => setWeather({ temp: 18, description: "Partly cloudy", icon: "⛅" }));
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
          <Cloud className="h-4 w-4 text-sky-400" />
          Weather
        </div>
        {weather ? (
          <div className="mt-2">
            <p className="text-2xl font-bold text-white">
              {weather.icon} {weather.temp}°C
            </p>
            <p className="text-sm text-white/55">{weather.description}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/45">Loading…</p>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
          <Wallet className="h-4 w-4 text-emerald-400" />
          Budget estimate
        </div>
        <div className="mt-2 space-y-1">
          {guide.daily_budget_eur != null ? (
            <p className="text-sm text-white/70">
              Daily: <span className="font-semibold text-white">€{guide.daily_budget_eur}</span>
            </p>
          ) : null}
          {guide.total_budget_eur != null ? (
            <p className="text-sm text-white/70">
              Total: <span className="font-semibold text-white">€{guide.total_budget_eur}</span>
            </p>
          ) : (
            <p className="text-sm text-white/45">Budget info coming soon</p>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
          <Sun className="h-4 w-4 text-amber-400" />
          Best season
        </div>
        <p className="mt-2 text-sm font-medium text-white">
          {guide.best_season ?? "Spring – Autumn"}
        </p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
          <Clock className="h-4 w-4 text-fuchsia-400" />
          Avg. visit
        </div>
        <p className="mt-2 text-sm font-medium text-white">
          {guide.avg_visit_duration_minutes
            ? `${Math.round(guide.avg_visit_duration_minutes / 60)}h avg per stop`
            : "Varies by stop"}
        </p>
        {guide.stop_count != null ? (
          <p className="mt-1 text-xs text-white/45">{guide.stop_count} destinations</p>
        ) : null}
      </GlassCard>
    </div>
  );
}

export function GuideSeasonBanner({ guide }: { guide: Guide }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <Calendar className="h-4 w-4 shrink-0" />
      <span>
        Best visiting season: <strong>{guide.best_season ?? "April – October"}</strong>
      </span>
    </div>
  );
}
