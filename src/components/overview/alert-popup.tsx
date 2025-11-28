
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert } from '@/lib/types';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface AlertsPopupProps {
  dbName: string;
  alerts: Alert[];
  onClose: () => void;
}

const AlertIcon = ({ type }: { type: 'warning' | 'error' }) => {
    if (type === 'error') {
        return <ShieldAlert className="w-5 h-5 text-destructive" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
}

export default function AlertsPopup({ dbName, alerts, onClose }: AlertsPopupProps) {
  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Active Alerts for {dbName}</DialogTitle>
          <DialogDescription>
            Showing {alerts.length} unacknowledged alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-6">
            {alerts.length > 0 ? (
                alerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-4">
                        <AlertIcon type={alert.type} />
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-muted-foreground py-8">No active alerts for this database.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
