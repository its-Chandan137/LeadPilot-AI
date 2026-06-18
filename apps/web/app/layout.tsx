import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPilot AI",
  description: "Embeddable chat widget foundation for LeadPilot AI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
