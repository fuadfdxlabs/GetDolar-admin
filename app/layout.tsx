import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GetDolar Admin",
  description: "Dashboard invoice dengan pengiriman WhatsApp siap pakai.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
