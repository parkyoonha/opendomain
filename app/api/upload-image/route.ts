import { NextResponse } from "next/server";

// Edge runtime so the function stays within Vercel's generous free-tier
// quota (500K invocations / month). ImgBB is called server-side so the
// API key never reaches the browser.
export const runtime = "edge";

export async function POST(req: Request) {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IMGBB_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const incoming = await req.formData();
    const file = incoming.get("image");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "image field is missing or not a file." },
        { status: 400 },
      );
    }

    // ImgBB accepts multipart form uploads with a `key` query param. Pass
    // the uploaded blob straight through — no re-encoding needed.
    const outgoing = new FormData();
    outgoing.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", body: outgoing },
    );
    const data = (await res.json()) as {
      success?: boolean;
      status?: number;
      data?: {
        url?: string;
        display_url?: string;
        delete_url?: string;
      };
      error?: { message?: string };
    };
    if (!res.ok || !data.success || !data.data?.url) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            `ImgBB upload failed (status ${res.status}).`,
        },
        { status: res.status || 500 },
      );
    }

    return NextResponse.json({
      url: data.data.url,
      displayUrl: data.data.display_url ?? data.data.url,
      deleteUrl: data.data.delete_url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
