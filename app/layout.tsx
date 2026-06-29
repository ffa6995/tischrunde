import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { PWARegister } from "@/components/PWARegister";
import { InstallPrompt } from "@/components/InstallPrompt";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tischrunde — Spielrunden finden",
    template: "%s · Tischrunde",
  },
  description:
    "Der digitale Tischplan für deinen nächsten Spieleabend im Dreiländereck: offene Runden sehen, beitreten oder selbst eröffnen.",
  applicationName: "Tischrunde",
  appleWebApp: { capable: true, title: "Tischrunde", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "de_AT",
    siteName: "Tischrunde",
    title: "Tischrunde — Spielrunden finden",
    description:
      "Offene Spielrunden bei lokalen Events sehen, beitreten oder selbst eröffnen.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EADBBE" },
    { media: "(prefers-color-scheme: dark)", color: "#191310" },
  ],
};

/**
 * Setzt data-theme vor dem ersten Paint (kein Flash). Default: light,
 * außer der Nutzer hat zuvor dark gewählt (localStorage) oder das System
 * bevorzugt dark und es gibt keine gespeicherte Wahl.
 */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem("tr-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" data-theme="light" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-[1100px]">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1">{children}</div>
              <div className="lg:hidden">
                <BottomNav />
              </div>
            </div>
          </div>
          <PWARegister />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
