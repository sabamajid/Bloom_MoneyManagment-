import { NextResponse } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { parseUpdateAccountInput, parseUuid } from "@/lib/validation/account";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params;
    const idParsed = parseUuid(rawId, "Account id");
    if (!idParsed.ok) return jsonError(idParsed.message, 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const json = (await request.json()) as unknown;
    const parsed = parseUpdateAccountInput(json);
    if (!parsed.ok) return jsonError(parsed.message, 400);

    const patch = parsed.value;
    const { data, error } = await supabase
      .from("user_accounts")
      .update(patch)
      .eq("id", idParsed.value)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not update account.", 500);
    }

    if (!data) {
      return jsonError("Account not found.", 404);
    }

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params;
    const idParsed = parseUuid(rawId, "Account id");
    if (!idParsed.ok) return jsonError(idParsed.message, 400);

    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return jsonError("Unauthorized", 401);

    const { count, error: countError } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("account_id", idParsed.value);

    if (countError) {
      console.error(countError);
      return jsonError("Could not verify transactions.", 500);
    }

    if (count && count > 0) {
      return jsonError(
        "This account has transactions. Delete those first or keep the account.",
        400,
      );
    }

    const { data, error } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", idParsed.value)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(error);
      return jsonError(error.message || "Could not delete account.", 500);
    }

    if (!data) {
      return jsonError("Account not found.", 404);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}
