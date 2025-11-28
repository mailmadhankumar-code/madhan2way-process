
"use client";

import React from "react";
import { TimeSeriesData, IoDetail } from "@/lib/types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { downsample } from "@/lib/client/chart-utils";

const MAX_DATA_POINTS = 100; // Limit the number of data points to render

interface PerformanceChartProps {
  data: TimeSeriesData[];
  data2?: TimeSeriesData[];
  title: string;
  valueSuffix: string;
  series1Name?: string;
  series2Name?: string;
}

const CustomTooltip = ({ active, payload, label, valueSuffix }: any) => {
  if (active && payload && payload.length) {
    const date = parseISO(label);
    const formattedDate = format(date, 'MMM d, h:mm a');
    const ioDetails = payload[0]?.payload?.details;

    const containerClassName = `bg-background border border-border p-2 rounded-md shadow-lg ${ioDetails && ioDetails.length > 0 ? 'min-w-[350px]' : ''}`;
    const gridClassName = `grid ${payload.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 gap-y-1`;

    return (
      <div className={containerClassName}>
        <p className="font-bold text-center mb-2">{formattedDate}</p>
        <div className={gridClassName}>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {p.value.toFixed(2)}{valueSuffix}
                </div>
            ))}
        </div>
        {ioDetails && ioDetails.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
                <p className="font-bold mb-1">Disk I/O Details:</p>
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="text-muted-foreground">
                            <th className="pr-2">Disk</th>
                            <th className="px-2">Mount</th>
                            <th className="px-2 text-right">R MB/s</th>
                            <th className="px-2 text-right">W MB/s</th>
                            <th className="pl-2 text-right">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ioDetails.map((d: IoDetail, i: number) => (
                            <tr key={i}>
                                <td className="pr-2">{d.device}</td>
                                <td className="px-2">{d.mount_point}</td>
                                <td className="px-2 text-right">{d.read_mb_s.toFixed(2)}</td>
                                <td className="px-2 text-right">{d.write_mb_s.toFixed(2)}</td>
                                <td className="pl-2 text-right">{typeof d.usage_percent === 'number' ? `${d.usage_percent.toFixed(1)}%` : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ data, data2, title, valueSuffix, series1Name, series2Name }: PerformanceChartProps) {
    const downsampledData = React.useMemo(() => downsample(data, MAX_DATA_POINTS), [data]);
    const downsampledData2 = React.useMemo(() => data2 ? downsample(data2, MAX_DATA_POINTS) : undefined, [data2]);

    if (!downsampledData || downsampledData.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No data available for {title}</div>;
    }

    const combinedData = downsampledData.map((item, index) => {
        const newItem: any = {
            date: item.date,
            value: item.value,
            details: item.details 
        };
        if (downsampledData2 && downsampledData2[index]) {
            newItem.value2 = downsampledData2[index].value;
        }
        return newItem;
    });

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            {downsampledData2 && (
              <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
              </linearGradient>
            )}
          </defs>
          <XAxis 
            dataKey="date" 
            tickFormatter={(str) => {
                try {
                    return format(parseISO(str), 'h:mm a');
                } catch (e) {
                    return '';
                }
            }}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tickFormatter={(val) => `${val}${valueSuffix}`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} />
          <Area type="monotone" dataKey="value" name={series1Name || 'Value'} stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
          {downsampledData2 && (
            <Area type="monotone" dataKey="value2" name={series2Name || 'Value 2'} stroke="#82ca9d" fillOpacity={1} fill="url(#colorValue2)" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
