
"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "./sidebar";
import type { Customer, Alert, UserSession, Database } from "@/lib/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  customers: Customer[];
  selectedDbId: string;
  onDbSelect: (id: string) => void;
  alerts: Alert[];
  session: UserSession | null;
  dbs?: (Database & { isUp: boolean; osUp: boolean })[];
}

export default function DashboardLayout({
  children,
  customers,
  selectedDbId,
  onDbSelect,
  alerts,
  session,
  dbs
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        customers={customers}
        selectedDbId={selectedDbId}
        onDbSelect={onDbSelect}
        alerts={alerts}
        session={session}
        dbs={dbs}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
