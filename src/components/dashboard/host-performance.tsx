
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceChart } from "@/components/charts/performance-chart";
import { Kpi, PerformanceData } from "@/lib/types";

interface HostPerformanceProps {
  performanceData: PerformanceData;
  kpis: Kpi;
}

export default function HostPerformance({ performanceData, kpis }: HostPerformanceProps) {
  const [activeTab, setActiveTab] = useState("cpu");

  const renderChart = () => {
    switch (activeTab) {
      case "cpu":
        return <PerformanceChart data={performanceData.cpu || []} title="CPU Usage" valueSuffix="%" />;
      case "memory":
        return <PerformanceChart data={performanceData.memory || []} title="Memory Usage" valueSuffix="%" />;
      case "io":
        return (
          <PerformanceChart 
            data={performanceData.io_read || []} 
            data2={performanceData.io_write || []} 
            title="I/O Throughput" 
            valueSuffix="MB/s" 
            series1Name="Read" 
            series2Name="Write" 
          />
        );
      case "network":
        return (
          <PerformanceChart 
            data={performanceData.network_up || []} 
            data2={performanceData.network_down || []} 
            title="Network Throughput" 
            valueSuffix="MB/s" 
            series1Name="Up" 
            series2Name="Down" 
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Host Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cpu" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cpu">CPU</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="io">I/O</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>
          <div className="pt-4">
            {renderChart()}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
