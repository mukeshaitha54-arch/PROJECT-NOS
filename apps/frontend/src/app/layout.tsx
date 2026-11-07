import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CustomCursor } from "@/components/ui/CustomCursor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOS — Network Operations System",
  description:
    "Network Operations System — Real-time device monitoring, fleet management & telemetry platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={inter.className}>
        <CustomCursor />
        <Providers>
          <main className="min-h-screen flex flex-col justify-between">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
