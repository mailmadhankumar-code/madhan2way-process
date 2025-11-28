
"use client";

import { useState, memo } from "react";
import { TopProcesses, Process } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TopProcessesCardProps {
  processes: TopProcesses | undefined;
}

const ProcessTable = memo(({ data, type }: { data: Process[], type: 'cpu' | 'memory' | 'io' | 'network' }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No process data available.</p>;
  }

  const renderValue = (process: Process) => {
      switch (type) {
        case 'cpu':
          return `${(process.cpuPercent || 0).toFixed(2)}%`;
        case 'memory':
          return `${(process.memoryMb || 0).toFixed(2)} MB`;
        case 'io':
          return `${((process.readMb || 0) + (process.writeMb || 0)).toFixed(2)} MB`;
        case 'network':
          return `${((process.sentMb || 0) + (process.recvMb || 0)).toFixed(2)} MB`;
        default:
          return null;
      }
    };

  const getHeader = () => {
      switch(type) {
          case 'cpu': return "CPU %";
          case 'memory': return "Memory";
          case 'io': return "I/O Total";
          case 'network': return "Network Total";
          default: return "Value";
      }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PID</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Command</TableHead>
          <TableHead className="text-right">{getHeader()}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((process) => (
          <TableRow key={process.pid}>
            <TableCell>{process.pid}</TableCell>
            <TableCell>{process.user}</TableCell>
            <TableCell><div className="w-32 truncate" title={process.command}>{process.command}</div></TableCell>
            <TableCell className="text-right">{renderValue(process)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});

ProcessTable.displayName = 'ProcessTable';

export default function TopProcessesCard({ processes }: TopProcessesCardProps) {
    const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'io' | 'network'>('cpu');

    const renderContent = () => {
            const data = processes?.[activeTab] || [];
            return <ProcessTable data={data} type={activeTab} />;
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Top Processes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="cpu" onValueChange={(value) => setActiveTab(value as any)}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="cpu">By CPU</TabsTrigger>
                            <TabsTrigger value="memory">By Memory</TabsTrigger>
                            <TabsTrigger value="io">By I/O</TabsTrigger>
                            <TabsTrigger value="network">By Network</TabsTrigger>
                        </TabsList>
                        <div>
                            {renderContent()}
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        );
    }
