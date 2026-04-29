"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy } from "lucide-react";

export function CopyableInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const fullUrl =
      typeof window !== "undefined" && value.startsWith("/")
        ? `${window.location.origin}${value}`
        : value;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Copied to thy clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Try selecting manually.");
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        aria-label="Copy invite link"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
