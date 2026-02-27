import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Manrope } from "next/font/google";

import { AppAtmosphere } from "@/components/layout/app-atmosphere";
import { AppProviders } from "@/components/providers/app-providers";
import { ThemeController } from "@/components/providers/theme-controller";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnswerScope AI",
  description: "Enterprise AI visibility analytics platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var key = 'answerscope-theme';
                var stored = localStorage.getItem(key);
                var theme = (stored === 'light' || stored === 'dark')
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${anton.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppAtmosphere />
        <AppProviders>
          {children}
          <ThemeController />
        </AppProviders>
      </body>
    </html>
  );
}
