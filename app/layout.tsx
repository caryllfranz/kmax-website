import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KMAX Fitness | Your Community Gym",
  description: "Discover KMAX Fitness, a community gym where people come together to move, train, and grow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
