import { getBandAttendance } from "@/lib/facebook";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET() {
  const result = await getBandAttendance();
  return Response.json(
    { events: result.events },
    { status: result.status === "connected" ? 200 : 503, headers },
  );
}
