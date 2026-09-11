import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Colombo Hazard API",
  description: "API-only backend for the Colombo flood response platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
