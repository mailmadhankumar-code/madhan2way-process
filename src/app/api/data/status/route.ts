
import { NextResponse } from "next/server";
import { db_data_store } from "@/lib/server/db";

// This line is crucial for preventing Next.js from caching the response.
// It ensures that every request to this endpoint fetches the latest data.
export const dynamic = 'force-dynamic';

// This is the GET handler for the /api/data/status route.
export async function GET() {
  // Create an object to hold the status for each database.
  const statuses: { [key: string]: any } = {};

  // Iterate over all the keys (server IDs) in our in-memory data store.
  for (const serverId in db_data_store) {
    // Get the data for the current server.
    const serverData = db_data_store[serverId]?.data;

    // If data exists, extract the necessary status and uptime fields.
    if (serverData) {
      statuses[serverId] = {
        dbIsUp: serverData.dbIsUp,
        osIsUp: serverData.osIsUp,
        db_status: serverData.db_status,
        os_status: serverData.os_status,
        db_uptime: serverData.db_uptime,
        os_uptime: serverData.os_uptime,
      };
    }
  }

  // Return the complete status object as a JSON response.
  return NextResponse.json(statuses);
}
