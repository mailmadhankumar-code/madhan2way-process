
"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import SettingsPage from "@/components/dashboard/settings-page";
import { toast } from "@/hooks/use-toast";
import { Settings as AppSettings, Customer, Alert } from "@/lib/types";

export default function Settings() {
  const [selectedDbId, setSelectedDbId] = useState<string>("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [settingsRes, dataRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/data')
        ]);

        if (!settingsRes.ok) throw new Error('Failed to fetch settings');
        if (!dataRes.ok) throw new Error('Failed to fetch all server data');
        
        const settingsData: AppSettings = await settingsRes.json();
        const allServerData = await dataRes.json();
        
        const initialCustomers = settingsData.emailSettings?.customers || [];
        
        const finalCustomers = initialCustomers.map(c => ({
            ...c,
            databases: c.databases.map(db => {
                const serverInfo = allServerData[db.id];
                return {
                    ...db,
                    isUp: serverInfo?.data?.dbIsUp || false,
                    osUp: serverInfo?.data?.osIsUp || false
                };
            })
        }));
        
        setCustomers(finalCustomers);

        if (finalCustomers?.[0]?.databases?.[0]?.id) {
            setSelectedDbId(finalCustomers[0].databases[0].id);
        }

      } catch (error) {
        console.error("Failed to fetch initial data for sidebar:", error);
         toast({
            title: "Connection Error",
            description: "Could not fetch server list for sidebar.",
            variant: "destructive"
        });
      }
    };
    fetchInitialData();
  }, []);

  return (
    <DashboardLayout
      customers={customers}
      selectedDbId={selectedDbId}
      onDbSelect={setSelectedDbId}
      alerts={alerts}
    >
        <SettingsPage />
    </DashboardLayout>
  );
}
