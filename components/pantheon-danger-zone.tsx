"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  archiveGroupAction,
  deleteGroupAction,
  unarchiveGroupAction,
} from "@/app/(app)/groups/actions";

interface DangerZoneProps {
  slug: string;
  name: string;
  archived: boolean;
}

export function PantheonDangerZone({ slug, name, archived }: DangerZoneProps) {
  const [confirmName, setConfirmName] = useState("");
  const canDelete = confirmName.trim() === name;

  return (
    <div className="flex flex-col gap-6">
      {archived ? (
        <form action={unarchiveGroupAction} className="flex flex-col gap-2">
          <input type="hidden" name="slug" value={slug} />
          <p className="text-sm text-muted-foreground">
            This pantheon is archived — sealed from the public square and the
            altar of its members. Restore it to bring the rite back into the
            light.
          </p>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" className="font-display tracking-widest">
              Restore the pantheon
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Archiving hides this pantheon from the public square and from
            every member&apos;s altar. The vows and ledger remain — thou canst
            restore it later.
          </p>
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="outline" className="font-display tracking-widest" />
                }
              >
                Archive the pantheon
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    Archive {name}?
                  </DialogTitle>
                  <DialogDescription>
                    It will vanish from the directory and from every
                    member&apos;s altar. The vows and ledger remain intact —
                    thou canst restore it later from these settings.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <form action={archiveGroupAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <Button
                      type="submit"
                      className="gilded font-display tracking-widest"
                    >
                      Archive
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <form action={deleteGroupAction} className="flex flex-col gap-3 border-t border-border/60 pt-6">
        <input type="hidden" name="slug" value={slug} />
        <p className="text-sm text-fallen">
          To dissolve this pantheon forever, retype its name below. All vows,
          deeds, and tallies bound to it shall be unmade. There is no recall.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="confirmName" className="text-xs uppercase tracking-widest text-muted-foreground">
            Type <span className="font-display text-foreground">{name}</span> to confirm
          </Label>
          <Input
            id="confirmName"
            name="confirmName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
            placeholder={name}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="destructive"
            disabled={!canDelete}
            className="font-display tracking-widest"
          >
            Dissolve forever
          </Button>
        </div>
      </form>
    </div>
  );
}
