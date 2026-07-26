import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
  ),
  title: "GetDolar Admin",
  description: "Dashboard invoice dengan pengiriman WhatsApp siap pakai.",
  icons: {
    icon: "/getdolar-logo.png",
    shortcut: "/getdolar-logo.png",
    apple: "/getdolar-logo.png",
  },
  openGraph: {
    title: "GET DOLAR",
    description: "Bukti pembayaran member GET DOLAR.",
    images: [
      {
        url: "/og.png",
        width: 1024,
        height: 1024,
        alt: "GET DOLAR",
      },
    ],
    siteName: "GET DOLAR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GET DOLAR",
    description: "Bukti pembayaran member GET DOLAR.",
    images: ["/og.png"],
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
