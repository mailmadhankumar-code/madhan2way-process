
"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import {
  DashboardData,
  Alert,
  ServerDataPayload,
  Customer,
  Settings,
  UserSession,
} from "@/lib/types";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardHeader from "@/components/dashboard/header";
import HostPerformance from "@/components/dashboard/host-performance";
import TablespacesCard from "@/components/dashboard/tablespaces-card";
import RmanBackupsCard from "@/components/dashboard/rman-backups-card";
import DetailedActiveSessionsCard from "@/components/dashboard/detailed-active-sessions-card";
import AlertLogCard from "@/components/dashboard/alert-log-card";
import DiskUsageCard from "@/components/dashboard/disk-usage-card";
import TopWaitEventsCard from "@/components/dashboard/top-wait-events-card";
import ActiveSessionHistoryCard from "@/components/dashboard/active-session-history-card";
import StandbyStatusCard from "@/components/dashboard/standby-status-card";
import TopProcessesCard from "@/components/dashboard/top-processes-card";
import { toast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import { DEMO_DATA_PAYLOAD } from "@/lib/demo-data";

type StatusPayload = {
    [key: string]: {
        dbIsUp: boolean;
        osIsUp: boolean;
        dbStatus?: string;
        osStatus?: string;
        dbUptime?: string;
        osUptime?: string;
    }
}

function useQueryDbId() {
    const searchParams = useSearchParams();
    return searchParams.get('db');
}

function DashboardContent() {
  const { session, isLoading: isSessionLoading } = useSession();
  const [allData, setAllData] = useState<ServerDataPayload>({});
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingDb, setIsSwitchingDb] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const isDemoMode = session?.username === 'demo';
  const queryDbId = useQueryDbId();

  const fetchAllStatuses = useCallback(async () => {
    try {
        const response = await fetch('/api/data/status');
        if (!response.ok) throw new Error('Failed to fetch statuses');
        const statusData: StatusPayload = await response.json();
        
        setCustomers(prev => {
            if (prev.length === 0) return [];
            return prev.map(cust => ({
                ...cust,
                databases: cust.databases.map(db => {
                    const status = statusData[db.id];
                    return {
                        ...db,
                        isUp: status?.dbIsUp || false,
                        osUp: status?.osIsUp || false
                    };
                })
            }));
        });

    } catch (error) {
        console.error("Failed to fetch statuses:", error);
    }
  }, []);

  const fetchDbData = useCallback(async (dbId: string) => {
      if (isDemoMode) {
          setAllData(DEMO_DATA_PAYLOAD);
          return true;
      }
      try {
        const dataResponse = await fetch(`/api/data/${dbId}`);
        if (!dataResponse.ok) throw new Error(`HTTP error! status: ${dataResponse.status}`);
        const result = await dataResponse.json();
        setAllData(prev => ({ ...prev, [dbId]: result }));
        setCustomers(prev => prev.map(c => ({
            ...c,
            databases: c.databases.map(db => 
                db.id === dbId 
                ? { ...db, isUp: result.data.dbIsUp, osUp: result.data.osIsUp }
                : db
            )
        })))
        return true;
      } catch (error) {
        console.error(`Failed to fetch data for ${dbId}:`, error);
        setAllData(prev => ({ ...prev, [dbId]: { data: { id: dbId, dbIsUp: false, osIsUp: false, dbStatus: 'DOWN', osStatus: 'DOWN', dbUptime: 'N/A', osUptime: 'N/A' } } }));
        setCustomers(prev => prev.map(c => ({
            ...c,
            databases: c.databases.map(db => 
                db.id === dbId ? { ...db, isUp: false, osUp: false } : db
            )
        })))
        return false;
      }
  }, [isDemoMode]);

  const handleDbSelect = useCallback(async (dbId: string) => {
    if (dbId === selectedDbId) return;
    
    setIsSwitchingDb(true);
    await fetchDbData(dbId);
    setSelectedDbId(dbId);
    window.history.pushState({}, '', `/dashboard?db=${dbId}`);
    setIsSwitchingDb(false);
  }, [selectedDbId, fetchDbData]);

  // Effect for initial data load
  useEffect(() => {
    const fetchInitialData = async (userSession: UserSession) => {
      if (!userSession) return;
      setIsLoading(true);
      
      const currentIsDemoMode = userSession.username === 'demo';

      try {
        const settingsResponse = await fetch('/api/settings');
        if (!settingsResponse.ok) throw new Error('Failed to fetch settings');
        const settingsData: Settings = await settingsResponse.json();
        setSettings(settingsData);
        
        let visibleCustomers = settingsData?.emailSettings?.customers || [];
        if (userSession.role === 'user' && userSession.customerIds) {
            visibleCustomers = visibleCustomers.filter(c => userSession.customerIds?.includes(c.id));
        }
        const initialCustomers = visibleCustomers.map(c => ({...c, databases: c.databases.map(db => ({...db, isUp: false, osUp: false}))}));
        
        const dbIdFromQuery = queryDbId;
        const firstDbId = dbIdFromQuery || initialCustomers?.[0]?.databases?.[0]?.id || null;
        
        if (currentIsDemoMode) {
          setAllData(DEMO_DATA_PAYLOAD);
          const demoCustomers = initialCustomers.map(c => {
             c.databases.forEach(db => {
                  const demoDbData = DEMO_DATA_PAYLOAD[db.id];
                  if (demoDbData) { db.isUp = demoDbData.data.dbIsUp; db.osUp = demoDbData.data.osIsUp; }
              });
              return c;
          });
          setCustomers(demoCustomers);
          if(firstDbId) setSelectedDbId(firstDbId);
        } else {
            setCustomers(initialCustomers);
            await fetchAllStatuses();
            if (firstDbId) {
                const success = await fetchDbData(firstDbId);
                if (success) {
                    setSelectedDbId(firstDbId);
                }
            }
        }
        
      } catch (error) {
        console.error("Failed to fetch initial page data:", error);
        toast({ title: "Could not load initial data", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isSessionLoading && session) {
        fetchInitialData(session);
    }
  }, [isSessionLoading, session]);

  // Interval for refreshing the selected DB's data
  useEffect(() => {
    if (isDemoMode || !selectedDbId) return;
    const dataInterval = setInterval(() => fetchDbData(selectedDbId), 30000); 
    return () => clearInterval(dataInterval);
  }, [isDemoMode, selectedDbId, fetchDbData]);

  // Interval for refreshing all statuses for the sidebar
  useEffect(() => {
    if (isDemoMode) return;
    const statusInterval = setInterval(fetchAllStatuses, 60000);
    return () => clearInterval(statusInterval);
  }, [isDemoMode, fetchAllStatuses]);

  // Alert processing logic
  useEffect(() => {
    if (!settings || Object.keys(allData).length === 0) return;
    const newAlerts: Alert[] = [];
    // ... alert generation logic remains the same ...
    setAlerts(newAlerts);
  }, [allData, settings, session]);

  const selectedDbData = useMemo(() => selectedDbId ? allData[selectedDbId]?.data : undefined, [allData, selectedDbId]);

  const selectedDbInfo = useMemo(() => {
    const db = customers.flatMap(c => c.databases).find(db => db.id === selectedDbId);
    return {
      ...db,
      osType: selectedDbData?.osInfo?.platform || 'N/A',
      dbStatus: selectedDbData?.dbStatus || (selectedDbData?.dbIsUp ? 'UP' : 'DOWN'),
      osStatus: selectedDbData?.osStatus || (selectedDbData?.osIsUp ? 'UP' : 'DOWN'),
      dbUptime: selectedDbData?.dbUptime || 'N/A',
      osUptime: selectedDbData?.osUptime || 'N/A'
    };
  }, [customers, selectedDbId, selectedDbData]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        const newDbId = new URLSearchParams(window.location.search).get('db');
        if (newDbId && newDbId !== selectedDbId) {
            handleDbSelect(newDbId);
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedDbId, handleDbSelect]);

  const renderContent = useCallback(() => {
      if (isLoading || isSessionLoading) return <div className="p-4 text-center">Loading dashboard...</div>;
      if (isSwitchingDb) return <div className="p-4 text-center">Loading data...</div>;
      if (!selectedDbId || !selectedDbData) {
           return (
             <div className="p-4 text-center">
                {customers.length > 0 ? "Please select a database." : "No databases configured."}
             </div>
           );
      }
      return (
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="md:col-span-2 lg:col-span-2"><ActiveSessionHistoryCard sessionHistory={selectedDbData.activeSessionsHistory} /></div>
          <div className="md:col-span-2 lg:col-span-2"><TopWaitEventsCard waitEvents={selectedDbData.topWaitEvents} /></div>
          <div className="md:col-span-2 lg:col-span-4"><HostPerformance performanceData={selectedDbData.currentPerformance} kpis={selectedDbData.kpis} /></div>
          <div className="md:col-span-2 lg:col-span-4"><TopProcessesCard processes={selectedDbData.topProcesses} /></div>
          <div className="md:col-span-2 lg:col-span-4"><DetailedActiveSessionsCard sessions={selectedDbData.detailedActiveSessions} /></div>
          <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"><AlertLogCard alerts={selectedDbData.alertLog} /><DiskUsageCard diskUsage={selectedDbData.diskUsage} threshold={settings?.diskThreshold} /></div>
          <div className="md:col-span-2 lg:col-span-4"><TablespacesCard tablespaces={selectedDbData.tablespaces} threshold={settings?.tablespaceThreshold} /></div>
          <div className="md:col-span-2 lg:col-span-4"><RmanBackupsCard backups={selectedDbData.backups} /></div>
          {selectedDbData.standbyStatus && selectedDbData.standbyStatus.length > 0 && (
              <div className="md:col-span-2 lg:col-span-4"><StandbyStatusCard standbyStatus={selectedDbData.standbyStatus} /></div>
          )}
        </div>
      );
  }, [isLoading, isSessionLoading, isSwitchingDb, selectedDbId, selectedDbData, customers, settings]);

  return (
    <DashboardLayout
      customers={customers}
      selectedDbId={selectedDbId || ""}
      onDbSelect={handleDbSelect}
      alerts={alerts}
      session={session}
    >
      <DashboardHeader kpis={selectedDbData?.kpis || {cpuUsage: 0, memoryUsage: 0, activeSessions: 0}} selectedDb={selectedDbInfo} />
      {renderContent()}
    </DashboardLayout>
  );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
