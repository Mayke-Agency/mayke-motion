import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mayke Motion",
  description: "A modern business operating system for Mayke Agency clients."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
