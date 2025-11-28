
import { NextResponse } from "next/server";
import { db_data_store, updateDbData } from "@/lib/server/db";
import { ServerDataPayload } from "@/lib/types";
import { processAlerts } from "@/lib/server/alert-manager";

// Helper function to convert snake_case keys to camelCase
const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/([-_][a-z])/ig, ($1) => {
                return $1.toUpperCase()
                    .replace('-', '')
                    .replace('_', '');
            });
            acc[camelKey] = toCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

export async function POST(request: Request) {
    try {
        const payload: ServerDataPayload = await request.json();
        const dbId = Object.keys(payload)[0];

        if (!dbId) {
            return NextResponse.json({ error: "Database ID is missing in the payload" }, { status: 400 });
        }

        const data = payload[dbId];
        if (!data) {
            return NextResponse.json({ error: "Data is missing in the payload" }, { status: 400 });
        }
        
        // *** CRITICAL FIX: Convert all incoming data to camelCase ***
        const camelCaseData = toCamelCase(data.data);

        // Reconstruct the payload with the transformed data
        const correctedPayload: ServerDataPayload = {
            [dbId]: {
                ...data,
                data: camelCaseData,
            }
        };

        // Update the data store with the camelCase version
        updateDbData(dbId, correctedPayload[dbId]);

        // Process alerts if there are any
        if (data.alerts && data.alerts.length > 0) {
            await processAlerts(dbId, data.alerts);
        }

        console.log(`[API /report] Received data for ${dbId}`);
        return NextResponse.json({ message: `Data for ${dbId} processed successfully` });

    } catch (error) {
        console.error("[API /report] Error processing report:", error);
        // If the error is a SyntaxError, it's likely a JSON parsing issue.
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }
        return NextResponse.json({ error: "An internal server error occurred" }, { status: 500 });
    }
}
