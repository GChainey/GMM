import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, pledges } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { isChallengeDate } from "@/lib/dates";
import { MAX_PROOF_BYTES } from "@/lib/proof-media";

const payloadSchema = z.object({
  activityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function ensureOwnership(activityId: string, userId: string) {
  const [row] = await db
    .select({ pledgeUserId: pledges.userId })
    .from(activities)
    .innerJoin(pledges, eq(pledges.id, activities.pledgeId))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!row || row.pledgeUserId !== userId) {
    throw new Error("This rite is not thine to mark.");
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
          throw new Error("Only May dates may be marked.");
        }
        await ensureOwnership(parsed.activityId, userId);
        const expectedPrefix = `proofs/${userId}/${parsed.activityId}/${parsed.date}-`;
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Bad upload path.");
        }
        return {
          allowedContentTypes: ["image/*", "video/*", "audio/*"],
          maximumSizeInBytes: MAX_PROOF_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            userId,
            activityId: parsed.activityId,
            date: parsed.date,
          }),
        };
      },
      onUploadCompleted: async () => {
        // The browser calls recordProofUploadAction after upload to write the
        // DB row. This webhook only fires from a publicly reachable URL, so
        // doing the DB write here would skip every local-dev upload.
      },
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
