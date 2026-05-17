"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { StoryItem } from "@/types";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  stories: StoryItem[];
  className?: string;
}

export function StoryViewer({ stories, className }: StoryViewerProps) {
  return (
    <motion.div className={cn("w-full min-w-0 max-w-full", className)}>
      <motion.div className="flex min-w-0 max-w-full gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="shrink-0"
          >
            <Link
              href={`/venues/${s.venue_slug}`}
              className="group flex w-[76px] flex-col items-center gap-2"
            >
              <div className="rounded-full bg-gradient-to-tr from-sky-400 via-fuchsia-500 to-amber-300 p-[2px]">
                <div className="rounded-full bg-black p-[2px]">
                  <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full">
                    <Image src={s.thumbnail_url} alt="" fill className="object-cover transition group-hover:scale-105" />
                  </div>
                </div>
              </div>
              <span className="max-w-[76px] truncate text-center text-[11px] font-medium text-white/80">
                {s.venue_name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">{s.label}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
