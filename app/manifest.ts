import type { MetadataRoute } from "next";

/** PWA-Manifest (Konzept §13.2 — PWA zuerst). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tischrunde",
    short_name: "Tischrunde",
    description:
      "Der digitale Tischplan für deinen nächsten Spieleabend im Dreiländereck.",
    start_url: "/",
    display: "standalone",
    background_color: "#EADBBE",
    theme_color: "#2F7D4F",
    lang: "de",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
