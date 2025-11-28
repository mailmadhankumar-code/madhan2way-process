
"use client";

import React from "react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Database, Alert } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

const StatusIndicator = ({ isUp }: { isUp: boolean }) => (
    <div
        className={`w-2.5 h-2.5 rounded-full ${isUp ? "bg-green-500" : "bg-red-500"}`}
    />
);

interface DatabasePanelProps {
    db: Database & {
        kpis: {
            cpuUsage: number;
            memoryUsage: number;
        };
        isUp: boolean;
        osUp: boolean;
        alerts: Alert[];
    };
    onAlertsClick: () => void;
    onInfoClick: () => void;
}

export default function DatabasePanel({ db, onAlertsClick, onInfoClick }: DatabasePanelProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{db.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <StatusIndicator isUp={db.isUp} />
                            Database Status
                        </span>
                        <span className={`text-sm font-semibold ${db.isUp ? 'text-green-600' : 'text-red-600'}`}>
                            {db.isUp ? "Up" : "Down"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <StatusIndicator isUp={db.osUp} />
                            OS Status
                        </span>
                        <span className={`text-sm font-semibold ${db.osUp ? 'text-green-600' : 'text-red-600'}`}>
                            {db.osUp ? "Up" : "Down"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between cursor-pointer" onClick={onAlertsClick}>
                        <span className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            Alerts
                        </span>
                        <Badge variant={db.alerts.length > 0 ? "destructive" : "secondary"}>
                            {db.alerts.length}
                        </Badge>
                    </div>
                    <div className="pt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">CPU Usage</span>
                            <span className="text-sm font-medium">{db.kpis.cpuUsage.toFixed(1)}%</span>
                        </div>
                        <Progress value={db.kpis.cpuUsage} />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Memory Usage</span>
                            <span className="text-sm font-medium">{db.kpis.memoryUsage.toFixed(1)}%</span>
                        </div>
                        <Progress value={db.kpis.memoryUsage} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onInfoClick}>Info</Button>
                <Link href={`/dashboard?db=${db.id}`}>
                    <Button>Dashboard</Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
