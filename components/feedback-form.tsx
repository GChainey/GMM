"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/app/(app)/changelog/actions";

export function FeedbackForm() {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 4) {
      toast.error("Add a few more words.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await submitFeedbackAction({ body: trimmed });
        setBody("");
        setLastUrl(result.url);
        toast.success("Feedback dispatched. Gareth will see it.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not send";
        toast.error(msg);
      }
    });
  }

  return (
    <Card className="marble-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Leave feedback</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bug, idea, plea, complaint — anything goes. Each note opens a ticket
          straight on Gareth&apos;s GitHub.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="What broke? What would be goated? What's missing?"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Thy display name is attached for context.
          </p>
          <Button
            type="button"
            disabled={isPending || body.trim().length < 4}
            onClick={submit}
            className="gilded font-display tracking-widest"
          >
            {isPending ? "Dispatching…" : "Send to Gareth"}
          </Button>
        </div>
        {lastUrl && (
          <p className="text-xs text-muted-foreground">
            Last note filed:{" "}
            <a
              href={lastUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              {lastUrl}
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
