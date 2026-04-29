import { buildEvents } from "@/lib/triw/program/buildEvents";

export async function GET() {
  const tracks = [
    { title: "曲A" },
    { title: "曲B" },
  ];

  const events = buildEvents(tracks);

  return Response.json({ events });
}

export async function POST(req: Request) {
  const tracks = [
    { title: "曲A" },
    { title: "曲B" },
  ];

  const events = buildEvents(tracks);

  return Response.json({ events });
}