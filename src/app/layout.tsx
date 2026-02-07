import type { Metadata } from "next";
import { DM_Sans, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dambo",
  description: "Dambo is a premium real-time data visualization platform for streaming and analyzing live datasets with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${shipporiMincho.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
