
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { TimeSeriesData } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Basic downsampling function to reduce the number of points in a series
export function downsample(data: any[], maxPoints: number): any[] {
  if (!data || data.length <= maxPoints) {
    return data;
  }

  const downsampledData: any[] = [];
  const every = Math.ceil(data.length / maxPoints);

  for (let i = 0; i < data.length; i += every) {
    downsampledData.push(data[i]);
  }

  return downsampledData;
}


