import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  try {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(error);
      return NextResponse.redirect(new URL("/login?error=auth", request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }
}
