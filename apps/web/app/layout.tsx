import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Track, analyze, and benchmark agentic work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
