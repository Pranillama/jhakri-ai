import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jhakri AI",
  description: "Real-time collaborative system design workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorBackground: "var(--bg-surface)",
          colorForeground: "var(--text-primary)",
          colorPrimary: "var(--accent-primary)",
          colorPrimaryForeground: "var(--bg-base)",
          colorMuted: "var(--bg-subtle)",
          colorMutedForeground: "var(--text-secondary)",
          colorInput: "var(--bg-subtle)",
          colorInputForeground: "var(--text-primary)",
          colorBorder: "var(--border-default)",
          colorNeutral: "var(--text-primary)",
          colorDanger: "var(--state-error)",
          colorSuccess: "var(--state-success)",
          colorWarning: "var(--state-warning)",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          // Flatten Clerk's default card so the form sits cleanly on the panel.
          cardBox: { boxShadow: "none", border: "none" },
          card: { backgroundColor: "transparent", boxShadow: "none", border: "none" },
          footer: { background: "transparent" },
          socialButtonsBlockButton: { borderColor: "var(--border-default)" },
        },
      }}
    >
      <html
        lang="en"
        className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
