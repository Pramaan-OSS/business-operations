import "@/styles/globals.css";
import "@business-operations/ui/globals.css";
import { cn } from "@business-operations/ui/cn";
import { Toaster } from "@business-operations/ui/toaster";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactElement } from "react";
import { DesktopHeader } from "@/components/desktop-header";
import { isDesktopApp } from "@/utils/desktop";
import { Providers } from "./providers";
const sans = localFont({ src: "../../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", variable: "--font-body", display: "swap", weight: "400 600" });
const serif = localFont({ src: "../../../../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2", variable: "--font-display", display: "swap", weight: "400" });
const mono = localFont({ src: "../../../../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", variable: "--font-code", display: "swap", weight: "400 500" });
export const dynamic = "force-dynamic";
export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "http://localhost:3001"), title: "Business Operations", description: "Manage business finances, documents, invoices and connected accounts." };
export const viewport = { width: "device-width", initialScale: 1 };
export default async function Layout({ children, params }: { children: ReactElement; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const desktop = await isDesktopApp();
  return <html lang={locale} suppressHydrationWarning className={cn(desktop && "desktop")}><body data-demo={process.env.PRAMAAN_FAKE === "1" ? "true" : undefined} className={cn(sans.variable, serif.variable, mono.variable, "font-sans antialiased")}><DesktopHeader /><NuqsAdapter><Providers locale={locale}>{process.env.PRAMAAN_FAKE === "1" && <p role="status" className="border p-3 text-center">Offline demonstration — all connected-service results are sample data.</p>}{children}<Toaster /></Providers></NuqsAdapter></body></html>;
}
