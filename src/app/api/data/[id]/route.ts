
import { NextResponse } from "next/server";
import { db_data_store } from "@/lib/server/db";

// This line is crucial for preventing Next.js from caching the response
// and ensures that the params object is correctly handled in dynamic routes.
export const dynamic = 'force-dynamic';

// This function handles the GET request for a specific database ID.
export async function GET(
  request: Request,
  { params }: { params: { id: string } } // params is kept for route matching but not used directly
) {
  try {
    // WORKAROUND: Instead of using the 'params' object which causes crashes with Turbopack,
    // we extract the ID directly from the request URL.
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];

    // If for some reason the ID is not found, return an error.
    if (!id) {
        return NextResponse.json({ error: "Database ID not found in URL" }, { status: 400 });
    }

    // Find the corresponding data in our in-memory store.
    const serverData = db_data_store[id];

    // If no data is found for the given ID, return a 404 Not Found response.
    if (!serverData) {
      return NextResponse.json({ error: `Data not found for ${id}` }, { status: 404 });
    }

    // If data is found, return it as a JSON response.
    return NextResponse.json(serverData);

  } catch (error) {
    console.error("[API /data/[id]] Error:", error);
    return NextResponse.json({ error: "An internal server error occurred" }, { status: 500 });
  }
}
