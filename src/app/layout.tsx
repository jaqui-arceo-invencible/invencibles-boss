import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Invencibles Boss — Un espacio para crecer",
  description: "Tu academia privada de capacitación y acompañamiento.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-MX" className={cn("font-sans")}><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
