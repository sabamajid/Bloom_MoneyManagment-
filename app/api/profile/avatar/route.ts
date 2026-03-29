import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function pathFromPublicUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = "/object/public/avatars/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + marker.length));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("Missing file.", 400);
    if (!ALLOWED.has(file.type)) return jsonError("Use JPG, PNG, WebP, or GIF.", 400);
    if (file.size > MAX_BYTES) return jsonError("Image must be 2 MB or smaller.", 400);

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const objectPath = `${user.id}/${Date.now()}.${ext}`;

    const { data: existing } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, default_monthly_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    const oldPath = existing?.avatar_url ? pathFromPublicUrl(existing.avatar_url) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from("avatars").upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      console.error(upErr);
      return jsonError(upErr.message || "Upload failed.", 500);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(objectPath);

    const { error: dbErr } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        display_name: existing?.display_name ?? null,
        avatar_url: publicUrl,
        default_monthly_limit: existing?.default_monthly_limit ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (dbErr) {
      console.error(dbErr);
      await supabase.storage.from("avatars").remove([objectPath]);
      return jsonError(dbErr.message || "Could not save profile.", 500);
    }

    if (oldPath && oldPath !== objectPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function DELETE() {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data: existing } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, default_monthly_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    const oldPath = existing?.avatar_url ? pathFromPublicUrl(existing.avatar_url) : null;
    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }

    const { error: dbErr } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        display_name: existing?.display_name ?? null,
        avatar_url: null,
        default_monthly_limit: existing?.default_monthly_limit ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (dbErr) {
      console.error(dbErr);
      return jsonError(dbErr.message || "Could not update profile.", 500);
    }

    return NextResponse.json({ avatarUrl: null });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
