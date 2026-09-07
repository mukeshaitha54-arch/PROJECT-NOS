import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen flex flex-col justify-between">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
