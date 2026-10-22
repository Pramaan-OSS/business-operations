import "@/styles/globals.css";
import type { ReactNode } from "react";
import localFont from "next/font/local";
const sans = localFont({ src: "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", variable: "--font-body", display: "swap" });
const serif = localFont({ src: "../../../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2", variable: "--font-display", display: "swap" });
const mono = localFont({ src: "../../../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", variable: "--font-code", display: "swap" });
export const metadata = { title: "Business Operations", description: "A local workspace for business finances, receipts and invoices." };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>{children}</body></html>; }
