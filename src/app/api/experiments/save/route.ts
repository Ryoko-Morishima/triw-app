import { mkdir, appendFile } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const experiment = await req.json();

    const dir = join(process.cwd(), "triw-experiments");

    await mkdir(dir, { recursive: true });

    const filePath = join(dir, "experiments.ndjson");

    await appendFile(
      filePath,
      JSON.stringify(experiment) + "\n",
      "utf8"
    );

    return Response.json({
      ok: true,
    });
  } catch (error) {
    console.error("save experiment error", error);

    return Response.json(
      {
        ok: false,
        error: "save failed",
      },
      {
        status: 500,
      }
    );
  }
}