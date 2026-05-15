import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/shell";

export const metadata: Metadata = {
  title: "BuilderOS",
  description: "Open-source, self-hostable agentic operating system for builders."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
