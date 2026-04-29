import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export async function ensureUserRow() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, clerkUser.id))
    .limit(1);

  const primaryEmail =
    clerkUser.emailAddresses?.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? null;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    primaryEmail?.split("@")[0] ||
    "Unnamed Mortal";

  if (existing.length === 0) {
    await db.insert(users).values({
      id: clerkUser.id,
      displayName,
      avatarUrl: null,
      timezone: "UTC",
    });
    return {
      id: clerkUser.id,
      displayName,
      avatarUrl: null,
      timezone: "UTC",
      createdAt: new Date(),
    };
  }

  const row = existing[0];
  if (row.displayName !== displayName) {
    await db
      .update(users)
      .set({ displayName })
      .where(eq(users.id, clerkUser.id));
    return { ...row, displayName };
  }
  return row;
}
