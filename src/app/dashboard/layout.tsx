import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

type LayoutProps = {
  readonly children: ReactNode;
};

export default function Layout({ children }: Readonly<LayoutProps>) {
  return (
      <DashboardLayout>{children}</DashboardLayout>
  )
}
