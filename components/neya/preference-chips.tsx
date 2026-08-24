"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipOption = {
  id: string;
  label: string;
  icon?: string;
};

interface PreferenceChipsProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (id: string) => void;
  name?: string;
  maxSelections?: number;
  className?: string;
}

/**
 * Shared multi-select chip component used by both onboarding and preferences.
 * Uses checkbox semantics for accessibility, with visual checkmark on selection.
 */
export function PreferenceChips({
  options,
  selected,
  onToggle,
  maxSelections,
  className,
}: PreferenceChipsProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onToggle(id);
    } else if (!maxSelections || selected.length < maxSelections) {
      onToggle(id);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        const atLimit =
          maxSelections != null &&
          !isSelected &&
          selected.length >= maxSelections;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            disabled={atLimit}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition",
              isSelected
                ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white"
                : atLimit
                  ? "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30"
                  : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10",
            )}
          >
            {isSelected ? (
              <Check className="h-3.5 w-3.5 text-fuchsia-300" strokeWidth={2.5} />
            ) : option.icon ? (
              <span className="text-xs">{option.icon}</span>
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
