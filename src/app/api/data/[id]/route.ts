
import { NextResponse } from "next/server";
import { db_data_store } from "@/lib/server/db";

// This function handles the GET request for a specific database ID.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Extract the database ID from the dynamic route parameters.
  const { id } = params;

  // Find the corresponding data in our in-memory store.
  const serverData = db_data_store[id];

  // If no data is found for the given ID, return a 404 Not Found response.
  if (!serverData) {
    return NextResponse.json({ error: "Data not found" }, { status: 404 });
  }

  // If data is found, return it as a JSON response.
  // All keys in the agent payload are already camelCase, so no transformation is needed here.
  // This ensures consistency with the frontend expectations.
  return NextResponse.json(serverData);
}
