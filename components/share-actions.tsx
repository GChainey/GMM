"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Link as LinkIcon, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  imageUrl: string;
  shareUrl: string;
  shareTitle: string;
  shareText: string;
  downloadFilename: string;
}

export function ShareActions({
  imageUrl,
  shareUrl,
  shareTitle,
  shareText,
  downloadFilename,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function onDownload() {
    setDownloading(true);
    try {
      const res = await fetch(imageUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Saved to thy archive.");
    } catch {
      toast.error("Could not summon the image.");
    } finally {
      setDownloading(false);
    }
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied — thy parchment is ready.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function onNativeShare() {
    setSharing(true);
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
      };
      if (!nav.share) {
        await onCopyLink();
        return;
      }
      // Try sharing the image as a file when we can; fall back to URL.
      try {
        const res = await fetch(imageUrl, { cache: "no-store" });
        if (res.ok && typeof File !== "undefined") {
          const blob = await res.blob();
          const file = new File([blob], downloadFilename, { type: blob.type || "image/png" });
          if (
            (nav as Navigator & {
              canShare?: (data: ShareData) => boolean;
            }).canShare?.({ files: [file] })
          ) {
            await nav.share({ files: [file], title: shareTitle, text: shareText });
            return;
          }
        }
      } catch {
        // fall through to URL share
      }
      await nav.share({ title: shareTitle, text: shareText, url: shareUrl });
    } catch (e) {
      // AbortError is fine (user cancelled).
      if ((e as { name?: string })?.name !== "AbortError") {
        toast.error("Could not open the share sheet.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onNativeShare}
        disabled={sharing}
        className="gilded font-display tracking-widest"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onDownload}
        disabled={downloading}
        className="font-display tracking-widest"
      >
        <Download className="h-4 w-4" />
        {downloading ? "Summoning…" : "Download"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCopyLink}
        className="font-display tracking-widest"
      >
        <LinkIcon className="h-4 w-4" />
        Copy link
      </Button>
    </div>
  );
}
