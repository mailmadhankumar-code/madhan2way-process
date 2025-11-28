
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TimeSeriesData } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // For performance, using JSON.parse and JSON.stringify for deep cloning.
  // This is generally safe for the data structures used in this app.
  // It doesn't handle Dates, Functions, undefined, Infinity, RegExps, Maps, Sets, etc.
  // but our data store only contains plain objects, arrays, and primitives.
  return JSON.parse(JSON.stringify(obj));
}

export function formatUptime(seconds: number | undefined | null): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return 'N/A';
  }

  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds -= days * 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds -= hours * 60 * 60;
  const minutes = Math.floor(seconds / 60);

  let result = '';
  if (days > 0) {
    result += `${days}d `;
  }
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0 || (days === 0 && hours === 0)) {
    result += `${minutes}m`;
  }

  return result.trim();
}

// Basic downsampling function
export function downsample(data: TimeSeriesData[], maxPoints: number): TimeSeriesData[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const downsampledData: TimeSeriesData[] = [];
  const every = Math.ceil(data.length / maxPoints);

  for (let i = 0; i < data.length; i += every) {
    downsampledData.push(data[i]);
  }

  return downsampledData;
}

