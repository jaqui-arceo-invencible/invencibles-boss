import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "./design-system.css";
import "./workspace-ui.css";
import "./brand-theme.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "Invencibles Boss — Un espacio para crecer",
  description: "Tu academia privada de capacitación y acompañamiento.",
  applicationName: "Invencibles Boss",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Invencibles", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#171717" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-MX" className={cn(roboto.variable, "font-sans")}><body className={roboto.className}><TooltipProvider>{children}</TooltipProvider></body></html>;
}
