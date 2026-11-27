import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "БОЧКОЛЁТ" },
      { name: "description", content: "Рофельный симулятор на бочколёте. Пять рейсов, бельё и диваны." },
      { name: "theme-color", content: "#1d4e9a" },
      { property: "og:image", content: "/og.jpg?v=4" },
      { name: "twitter:image", content: "/og.jpg?v=4" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico?v=4", sizes: "48x48" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png?v=4" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512.png?v=4" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/__grok/icon-180.png?v=4" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&family=Unbounded:wght@500;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
