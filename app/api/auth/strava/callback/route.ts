import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const base = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  if (error || !code) {
    return NextResponse.redirect(`${base}/settings?strava=error`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/settings?strava=error`);
  }

  const data = await tokenRes.json();

  const params = new URLSearchParams({
    at: data.access_token,
    rt: data.refresh_token,
    ea: String(data.expires_at),
    aid: String(data.athlete?.id ?? ""),
    name: data.athlete?.firstname ?? "",
  });

  return NextResponse.redirect(`${base}/strava?${params}`);
}
