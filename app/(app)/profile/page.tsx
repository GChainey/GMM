import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserRow, requireUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUploader } from "@/components/avatar-uploader";
import { FaceCustomizer } from "@/components/face-customizer";

export default async function ProfilePage() {
  await ensureUserRow();
  const userId = await requireUserId();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User row missing.");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          THY VISAGE
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Profile
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Anoint thyself with a portrait, or let the gods bestow a face upon
          thee.
        </p>
      </header>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            name={user.displayName}
            initialAvatarUrl={user.avatarUrl}
            customization={{
              faceStyle: user.faceStyle,
              faceColor: user.faceColor,
              faceGaze: user.faceGaze,
              faceDepth: user.faceDepth,
            }}
          />
        </CardContent>
      </Card>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Face hash</CardTitle>
        </CardHeader>
        <CardContent>
          <FaceCustomizer
            name={user.displayName}
            initial={{
              faceStyle: user.faceStyle,
              faceColor: user.faceColor,
              faceGaze: user.faceGaze,
              faceDepth: user.faceDepth,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
