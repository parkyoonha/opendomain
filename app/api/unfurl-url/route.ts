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

// Walk every <meta> tag in the document once and index them by
// their property / name / itemprop value. Reading subsequent lookups
// out of this map is both faster and much more robust than running a
// nested regex per attribute — big sites (YouTube, NYT, …) format
// meta tags across multiple lines and the key/content attribute
// order flips freely.
function parseMetaTags(html: string): Record<string, string> {
  const metas: Record<string, string> = {};
  const tagRe = /<meta\b([^>]*)>/gi;
  const propRe =
    /\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i;
  const contentRe = /\bcontent\s*=\s*["']([^"']*)["']/i;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const attrs = m[1];
    const prop = propRe.exec(attrs)?.[1];
    const content = contentRe.exec(attrs)?.[1];
    if (!prop || content === undefined) continue;
    const key = prop.trim().toLowerCase();
    // Earlier entry wins — og:image sometimes appears multiple times
    // for different sizes.
    if (!(key in metas)) metas[key] = decodeHtmlEntities(content);
  }
  return metas;
}

function readFirstMeta(
  metas: Record<string, string>,
  props: string[],
): string | undefined {
  for (const p of props) {
    const v = metas[p.toLowerCase()];
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

    const metas = parseMetaTags(html);
    const title =
      readFirstMeta(metas, [
        "og:title",
        "twitter:title",
        "parsely-title",
        "title",
      ]) ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = readFirstMeta(metas, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    let image = readFirstMeta(metas, [
      "og:image",
      "og:image:url",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
      "msapplication-tileimage",
    ]);
    const siteName = metas["og:site_name"];

    // Resolve relative image URLs against the fetched URL.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, res.url || url).toString();
      } catch {
        image = undefined;
      }
    }

    // Always surface SOMETHING readable so the UI can show a card
    // rather than falling back to a raw link whenever one of og:title
    // / og:image is present. If neither comes back, synthesize a
    // title from the hostname so links to very minimal pages still
    // render as "example.com" rather than the long raw URL.
    const hostnameFallback = (() => {
      try {
        return new URL(res.url || url).hostname.replace(/^www\./, "");
      } catch {
        return undefined;
      }
    })();
    const result: UnfurlResult = {
      url,
      title: title ? decodeHtmlEntities(title) : hostnameFallback,
      description,
      image,
      siteName: siteName ?? hostnameFallback,
    };
    // Vercel Edge log — visible in the project's Function Logs tab.
    // Helps diagnose "preview card doesn't show" without ssh.
    console.log(
      `[unfurl] ${url} → title=${Boolean(title)} image=${Boolean(image)} desc=${Boolean(description)} meta_count=${Object.keys(metas).length}`,
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg, url } satisfies UnfurlResult,
      { status: 200 },
    );
  }
}
