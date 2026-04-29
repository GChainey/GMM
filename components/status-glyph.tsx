import type { MemberStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const COPY: Record<MemberStatus, { label: string; subtle: string }> = {
  pending: { label: "Awaiting", subtle: "Sealed" },
  ascending: { label: "Ascending", subtle: "On the path" },
  fallen: { label: "Fallen", subtle: "Broken vow" },
  ascended: { label: "Ascended", subtle: "Among the gods" },
};

export function StatusGlyph({
  status,
  className,
}: {
  status: MemberStatus;
  className?: string;
}) {
  const copy = COPY[status];
  return (
    <div
      className={cn(
        "flex flex-col items-end gap-1 font-display text-[0.7rem] uppercase tracking-[0.25em]",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-sm border px-2 py-1",
          status === "ascended" &&
            "border-ascended/40 bg-ascended/10 text-ascended",
          status === "ascending" &&
            "border-divine/40 bg-divine/10 text-divine",
          status === "fallen" && "border-fallen/40 bg-fallen/10 text-fallen",
          status === "pending" && "border-border bg-muted text-muted-foreground",
        )}
      >
        {copy.label}
      </span>
    </div>
  );
}
