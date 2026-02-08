import type { Metadata } from "next";
import { DM_Sans, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TamboClientProvider } from "@/lib/tambo/TamboClientProvider";

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
  icons: [
    {
      rel: "icon",
      type: "image/png",
      url: "/mascot_v2.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      url: "/mascot_v2.png",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${shipporiMincho.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TamboClientProvider>
            {children}
          </TamboClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
