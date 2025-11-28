
import { NextResponse } from "next/server";
import { db_data_store } from "@/lib/server/db";

const TIMEOUT_MS = 30000; // 30 seconds

// This line is crucial for preventing Next.js from caching the response.
export const dynamic = 'force-dynamic';

// This function handles the GET request for a specific database ID.
export async function GET(
  request: Request,
) {
  try {
    // WORKAROUND: Extract the ID directly from the request URL to bypass Turbopack issues.
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    if (!id) {
        return NextResponse.json({ error: "Database ID not found in URL" }, { status: 400 });
    }

    const serverData = db_data_store[id];

    if (!serverData) {
      return NextResponse.json({ error: `Data not found for ${id}` }, { status: 404 });
    }

    // *** CRITICAL FIX ***
    // Calculate the 'isUp' and 'osUp' status here to ensure data consistency
    // with the /api/data/status endpoint.
    const lastSeen = serverData.lastSeen ? new Date(serverData.lastSeen).getTime() : 0;
    const isAgentUp = (new Date().getTime() - lastSeen) < TIMEOUT_MS;

    const responseData = {
        ...serverData,
        isUp: isAgentUp && serverData.currentPerformance?.dbStatus === 'UP',
        osUp: isAgentUp,
    };

    // Return the enriched data object.
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("[API /data/[id]] Error:", error);
    return NextResponse.json({ error: "An internal server error occurred" }, { status: 500 });
  }
}
