import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Command Control · Fender",
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return children;
}
