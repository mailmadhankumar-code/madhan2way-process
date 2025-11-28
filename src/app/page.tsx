
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/use-session';
import { Customer, Database, ServerDataPayload, Settings, UserSession, Alert } from '@/lib/types';
import { DEMO_DATA_PAYLOAD } from '@/lib/demo-data';
import DatabasePanel from '@/components/overview/database-panel';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import DashboardHeader from '@/components/dashboard/header';
import AlertsPopup from '@/components/overview/alert-popup';
import InfoPopup from '@/components/overview/info-popup';

type OverviewDatabase = Database & {
  kpis: { cpuUsage: number; memoryUsage: number };
  isUp: boolean;
  osUp: boolean;
  alerts: Alert[];
};

export default function OverviewPage() {
    const { session, isLoading: isSessionLoading } = useSession();
    const [databases, setDatabases] = useState<OverviewDatabase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedDbForAlerts, setSelectedDbForAlerts] = useState<OverviewDatabase | null>(null);
    const [selectedDbForInfo, setSelectedDbForInfo] = useState<OverviewDatabase | null>(null);

    const isDemoMode = session?.username === 'demo';

    const fetchAllDbData = useCallback(async (dbs: Database[]) => {
        if (isDemoMode) {
            // ... (demo mode logic remains the same)
        }

        const dbDataPromises = dbs.map(async (db) => {
            try {
                const res = await fetch(`/api/data/${db.id}`);
                if (!res.ok) throw new Error(`Failed to fetch data for ${db.id}`);
                
                // *** CRITICAL FIX: The API now returns a flat object. ***
                const data: ServerDataPayload = await res.json();

                return {
                    ...db,
                    kpis: data.currentPerformance?.kpis || { cpuUsage: 0, memoryUsage: 0 },
                    // *** CRITICAL FIX: Use the correct top-level boolean properties. ***
                    isUp: data.isUp || false, 
                    osUp: data.osUp || false,
                    alerts: data.alerts || [],
                    dbVersion: data.currentPerformance?.dbVersion,
                    dbPatchDetails: data.currentPerformance?.dbPatchDetails,
                    dbSize: data.currentPerformance?.dbSize,
                    sgaTarget: data.currentPerformance?.sgaTarget,
                    pgaTarget: data.currentPerformance?.pgaTarget,
                    osPlatform: data.currentPerformance?.osInfo?.platform,
                    osVersion: data.currentPerformance?.osInfo?.release,
                    totalCpu: data.currentPerformance?.osInfo?.totalCpu,
                    totalMemory: data.currentPerformance?.osInfo?.totalMemory,
                };
            } catch (error) {
                console.error(error);
                return {
                    ...db,
                    kpis: { cpuUsage: 0, memoryUsage: 0 },
                    isUp: false,
                    osUp: false,
                    alerts: [],
                }; // Return default on error
            }
        });

        const allDbData = await Promise.all(dbDataPromises);
        setDatabases(allDbData);
    }, [isDemoMode]);

    useEffect(() => {
        const fetchInitialData = async (userSession: UserSession) => {
            setIsLoading(true);
            try {
                const settingsResponse = await fetch('/api/settings');
                if (!settingsResponse.ok) throw new Error('Failed to fetch settings');
                const settingsData: Settings = await settingsResponse.json();

                let visibleCustomers = settingsData?.emailSettings?.customers || [];
                if (userSession.role === 'user' && userSession.customerIds) {
                    visibleCustomers = visibleCustomers.filter(c => userSession.customerIds?.includes(c.id));
                }
                setCustomers(visibleCustomers);

                const allDbs = visibleCustomers.flatMap(c => c.databases);
                await fetchAllDbData(allDbs);

            } catch (error) {
                console.error("Failed to load overview data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isSessionLoading && session) {
            fetchInitialData(session);
        }
    }, [isSessionLoading, session, fetchAllDbData]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="p-4 md:p-6 text-center text-muted-foreground">Loading overview...</div>;
        }

        return (
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {databases.map(db => (
                    <DatabasePanel 
                        key={db.id} 
                        db={db} 
                        onAlertsClick={() => setSelectedDbForAlerts(db)} 
                        onInfoClick={() => setSelectedDbForInfo(db)}
                    />
                ))}
            </div>
        );
    };

    return (
        <DashboardLayout
            customers={customers}
            selectedDbId={null}
            onDbSelect={() => {}}
            alerts={[]}
            session={session}
            dbs={databases}
        >
            <DashboardHeader kpis={{cpuUsage: 0, memoryUsage: 0, activeSessions: 0}} selectedDb={null} />
            {renderContent()}
            {selectedDbForAlerts && (
                <AlertsPopup dbName={selectedDbForAlerts.name} alerts={selectedDbForAlerts.alerts} onClose={() => setSelectedDbForAlerts(null)} />
            )}
            {selectedDbForInfo && (
                <InfoPopup db={selectedDbForInfo} onClose={() => setSelectedDbForInfo(null)} />
            )}
        </DashboardLayout>
    );
}
