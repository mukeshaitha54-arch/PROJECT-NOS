import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RealtimeProvider } from "@/features/realtime/contexts/socket.provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOS | Network Operating System",
  description: "Production-ready enterprise network operating system monitoring and management dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <RealtimeProvider>
          <main className="min-h-screen flex flex-col justify-between">
            {children}
          </main>
        </RealtimeProvider>
      </body>
    </html>
  );
}
