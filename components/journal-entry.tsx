"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveJournalAction } from "@/app/(app)/check-in/actions";

interface JournalEntryProps {
  date: string;
  initialBody: string;
}

export function JournalEntry({ date, initialBody }: JournalEntryProps) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await saveJournalAction({ date, body });
        setSavedBody(body);
        toast.success(
          body.trim().length === 0 ? "Journal cleared" : "Journal inscribed",
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  const dirty = body !== savedBody;

  return (
    <Card className="marble-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Journal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Optional. Reflect on the day&apos;s rite — kept private to thee.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="What was tested today? What did the gods reveal?"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={isPending || !dirty}
            onClick={save}
            variant="outline"
            className="font-display tracking-widest"
          >
            {isPending ? "Inscribing…" : dirty ? "Save journal" : "Saved"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
