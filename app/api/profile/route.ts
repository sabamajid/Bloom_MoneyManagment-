import { NextResponse } from "next/server";

import { ensureHouseholdAccess } from "@/lib/household/access";
import { formatSupabaseError } from "@/lib/supabase/formatError";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeDisplayName(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  if (t.length > 80) return null;
  return t;
}

function normalizeAvatarUrl(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0) return null;
  if (t.length < 8 || t.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return t;
}

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("GET /api/profile:", formatSupabaseError(error));
      return jsonError(error.message || "Could not load profile.", 500);
    }

    const access = await ensureHouseholdAccess(supabase);
    let household: { name: string; role: string } | null = null;
    if (access) {
      const { data: hrow } = await supabase
        .from("households")
        .select("name")
        .eq("id", access.householdId)
        .maybeSingle();
      household = {
        name: (hrow?.name as string | undefined) ?? "Family",
        role: access.role,
      };
    }

    return NextResponse.json({
      userId: user.id,
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
      household,
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = (await request.json()) as {
      displayName?: unknown;
      avatarUrl?: unknown;
    };

    const { data: existing, error: loadErr } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, default_monthly_limit")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error("PUT /api/profile load:", formatSupabaseError(loadErr));
      return jsonError(loadErr.message || "Could not load profile.", 500);
    }

    let nextDisplay: string | null = existing?.display_name ?? null;
    let nextAvatar: string | null = existing?.avatar_url ?? null;
    const nextBudgetDefault = existing?.default_monthly_limit ?? null;

    if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
      if (typeof body.displayName === "string" && body.displayName.trim().length > 80) {
        return jsonError("Display name must be 80 characters or less.", 400);
      }
      nextDisplay = normalizeDisplayName(body.displayName);
    }

    if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) {
      const avatarUrl = normalizeAvatarUrl(body.avatarUrl);
      if (
        typeof body.avatarUrl === "string" &&
        body.avatarUrl.trim().length > 0 &&
        avatarUrl === null
      ) {
        return jsonError("Avatar must be a valid http(s) URL.", 400);
      }
      nextAvatar = avatarUrl;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: nextDisplay,
          avatar_url: nextAvatar,
          default_monthly_limit: nextBudgetDefault,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("display_name, avatar_url")
      .single();

    if (error) {
      console.error("PUT /api/profile upsert:", formatSupabaseError(error));
      return jsonError(error.message || "Could not save profile.", 500);
    }

    return NextResponse.json({
      displayName: data.display_name ?? null,
      avatarUrl: data.avatar_url ?? null,
    });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
