import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { isChallengeDate } from "@/lib/dates";
import { MAX_PROOF_BYTES } from "@/lib/proof-media";

const payloadSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function ensureMember(groupId: string, userId: string) {
  const [row] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error("Only mortals of this pantheon may post.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = await requireUserId();
  await ensureUserRow();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = payloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
        if (!isChallengeDate(parsed.date)) {
          throw new Error("Only May dates may bear a recap.");
        }
        await ensureMember(parsed.groupId, userId);
        const expectedPrefix = `collective/${parsed.groupId}/${parsed.date}-`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Bad upload path.");
        }
        return {
          allowedContentTypes: ["image/*", "video/*", "audio/*"],
          maximumSizeInBytes: MAX_PROOF_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId,
            groupId: parsed.groupId,
            date: parsed.date,
          }),
        };
      },
      onUploadCompleted: async () => {
        // The browser writes the DB row via the server action after upload —
        // this webhook only fires from a publicly reachable URL, so doing the
        // DB write here would skip every local-dev upload.
      },
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
