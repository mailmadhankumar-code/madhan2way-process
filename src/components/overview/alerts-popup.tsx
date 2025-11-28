
"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { Alert as AlertType } from "@/lib/types";

interface AlertsPopupProps {
    alerts: AlertType[];
    onClose: () => void;
}

export default function AlertsPopup({ alerts, onClose }: AlertsPopupProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold mb-4">Alerts</h2>
                <div className="space-y-4">
                    {alerts.length > 0 ? (
                        alerts.map(alert => (
                            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                                <AlertTitle className="flex justify-between items-center">
                                    {alert.title}
                                    <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                                        {alert.type}
                                    </Badge>
                                </AlertTitle>
                                <AlertDescription>
                                    {alert.message}
                                </AlertDescription>
                            </Alert>
                        )) 
                    ) : (
                        <p className="text-muted-foreground">No alerts for this database.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
