import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const data = evt.data;
    const primaryEmail =
      data.email_addresses?.find(
        (e) => e.id === data.primary_email_address_id,
      )?.email_address ?? null;
    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      data.username ||
      primaryEmail?.split("@")[0] ||
      "Unnamed Mortal";

    await db
      .insert(users)
      .values({
        id: data.id,
        displayName,
        avatarUrl: data.image_url ?? null,
        timezone: "UTC",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName,
          avatarUrl: data.image_url ?? null,
        },
      });
  }

  return NextResponse.json({ ok: true });
}
