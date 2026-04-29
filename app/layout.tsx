import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SoundProvider } from "@/components/sound-provider";
import "./globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "God Mode May",
  description:
    "A monthly ritual of solemn pledges. Complete every activity every day or fall from grace. May 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
        <body className="min-h-full flex flex-col">
          <SoundProvider>
            <TooltipProvider delay={150}>{children}</TooltipProvider>
          </SoundProvider>
          <Toaster richColors closeButton position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
