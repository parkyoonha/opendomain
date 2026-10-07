import { NextResponse } from "next/server";

// Edge Function that fetches the given URL and extracts open-graph /
// twitter-card metadata so the client can render a thumbnail+title
// preview card inside a memo. Stays within Vercel's free tier.
export const runtime = "edge";

type UnfurlResult = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  error?: string;
};

// Pull a single tag like <meta property="og:title" content="…"> or the
// reversed attr order. Also supports <meta name="…">.
function readMeta(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function POST(req: Request) {
  let url: string;
  try {
    const body = (await req.json()) as { url?: string };
    url = (body.url ?? "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: "유효한 http(s) URL이 아닙니다." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; opendomain-link-preview/1.0)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    }).catch((err) => {
      throw err;
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `원격 응답 실패 (${res.status})`, url } satisfies UnfurlResult,
        { status: 200 },
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ url } satisfies UnfurlResult);
    }

    // Only read the first ~256KB — og tags live in <head>, no need to
    // slurp the whole document.
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const MAX = 256 * 1024;
    if (reader) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
          if (total >= MAX) {
            try {
              await reader.cancel();
            } catch {
              /* noop */
            }
            break;
          }
        }
      }
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);

    const title =
      readMeta(html, "og:title") ??
      readMeta(html, "twitter:title") ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const description =
      readMeta(html, "og:description") ??
      readMeta(html, "twitter:description") ??
      readMeta(html, "description");
    let image =
      readMeta(html, "og:image") ?? readMeta(html, "twitter:image");
    const siteName = readMeta(html, "og:site_name");

    // Resolve relative image URLs against the fetched URL.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, res.url || url).toString();
      } catch {
        image = undefined;
      }
    }

    const result: UnfurlResult = {
      url,
      title: title ? decodeHtmlEntities(title) : undefined,
      description,
      image,
      siteName,
    };
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg, url } satisfies UnfurlResult,
      { status: 200 },
    );
  }
}
