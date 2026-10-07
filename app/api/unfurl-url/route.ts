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

// Pull a single tag like <meta property="og:title" content="…"> or any
// of the common variations. Big sites (YouTube, NYT, …) format meta
// tags across multiple lines and sometimes stuff extra attributes
// between property and content, so we use [\s\S]* instead of . and
// handle both attribute orders.
function readMeta(html: string, prop: string): string | undefined {
  const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]*?(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][\\s\\S]*?content\\s*=\\s*["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*?content\\s*=\\s*["']([^"']+)["'][\\s\\S]*?(?:property|name|itemprop)\\s*=\\s*["']${escaped}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return undefined;
}

// Return the first meta value found across any of the given props. Lets
// us try og:image, og:image:url, og:image:secure_url, twitter:image,
// twitter:image:src in one go.
function readFirstMeta(html: string, props: string[]): string | undefined {
  for (const p of props) {
    const v = readMeta(html, p);
    if (v) return v;
  }
  return undefined;
}

// Pull the HTML's <meta charset=…> so we can decode non-UTF-8 pages.
function readCharset(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+charset\s*=\s*["']?([^"'\s/>]+)/i) ??
    html.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i);
  return m?.[1]?.toLowerCase();
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
    const timeout = setTimeout(() => controller.abort(), 10000);
    // Impersonate facebookexternalhit — the UA most widely whitelisted
    // by news sites, YouTube, blog platforms, and corporate pages
    // specifically for link-unfurling. Covers nearly all common cases
    // without site-by-site rules.
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
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

    // Vercel Edge streams unreliably across providers (YouTube's
    // chunked response in particular often terminates the reader
    // before any content lands). await the whole body and cap after;
    // OG tags live in <head> so the first ~256KB is what we need.
    const fullBuf = new Uint8Array(await res.arrayBuffer());
    const MAX = 256 * 1024;
    const buf = fullBuf.byteLength > MAX ? fullBuf.slice(0, MAX) : fullBuf;
    // Content-Type header may lie or be missing. Use UTF-8 to peek at
    // the page's <meta charset>; if it's non-UTF-8 (e.g. EUC-KR on
    // some Korean sites), redecode with that charset.
    let html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const headerCharset = (
      contentType.match(/charset=([^;]+)/i)?.[1] ?? ""
    )
      .trim()
      .toLowerCase();
    const metaCharset = readCharset(html);
    const charset = headerCharset || metaCharset;
    if (charset && charset !== "utf-8" && charset !== "utf8") {
      try {
        html = new TextDecoder(charset, { fatal: false }).decode(buf);
      } catch {
        /* unknown encoding → stick with UTF-8 decode */
      }
    }

    const title =
      readFirstMeta(html, [
        "og:title",
        "twitter:title",
        "parsely-title",
        "title",
      ]) ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = readFirstMeta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    let image = readFirstMeta(html, [
      "og:image",
      "og:image:url",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
      "msapplication-TileImage",
    ]);
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
