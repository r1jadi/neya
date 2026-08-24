import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEYA — Nightlife & Events",
    short_name: "NEYA",
    description:
      "Discover clubs, rooftops, live music, and student nights in Prishtina. Live atmosphere, reservations, guestlists, and tickets.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["entertainment", "lifestyle", "travel"],
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tonight",
        short_name: "Tonight",
        description: "What's happening tonight",
        url: "/events?when=tonight",
      },
      {
        name: "Map",
        short_name: "Map",
        description: "Live nightlife map",
        url: "/map",
      },
      {
        name: "My Night",
        short_name: "My Night",
        description: "Your night plan",
        url: "/my-night",
      },
    ],
  };
}
