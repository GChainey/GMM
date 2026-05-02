import { ImageResponse } from "next/og";
import {
  formatShareDate,
  getGroupRoundupShareData,
} from "@/lib/share-data";

export const alt = "Pantheon roundup — God Mode May";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PALETTE = {
  bg: "#f4ecd8",
  bgInner: "#fbf6e8",
  fg: "#2c241a",
  muted: "#7a6e58",
  border: "#d8cbab",
  divine: "#2b1f8a",
  divineSoft: "#e7e3f3",
  gold: "#c79b3f",
  goldSoft: "#f1e3b3",
  fallen: "#8a2820",
  fallenSoft: "#f1d6cf",
  ascended: "#5e8f5b",
  ascendedSoft: "#dceadb",
  penitent: "#b2521a",
  penitentSoft: "#f3dcc6",
};

interface Props {
  params: Promise<{ slug: string; date: string }>;
}

export default async function OgGroupRoundupImage({ params }: Props) {
  const { slug, date } = await params;
  const data = await getGroupRoundupShareData(slug, date);

  if (!data) return fallback("Pantheon not found");

  const {
    group,
    members,
    longestStreak,
    firstToday,
    shippedOutcomesToday,
    fallenToday,
    ascendingCount,
    fallenCount,
    ascendedCount,
    penitentCount,
  } = data;

  const total = members.length;
  const visible = members.slice(0, 6);
  const overflow = members.length - visible.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PALETTE.bg,
          padding: "44px 56px",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: PALETTE.fg,
          backgroundImage:
            "radial-gradient(circle at top right, rgba(255,255,255,0.6), transparent 50%), radial-gradient(circle at bottom left, rgba(43, 31, 138, 0.13), transparent 60%)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${PALETTE.border}`,
            paddingBottom: 14,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                letterSpacing: 6,
                color: PALETTE.muted,
                textTransform: "uppercase",
              }}
            >
              GOD MODE MAY · PANTHEON ROUNDUP
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 600,
                color: PALETTE.fg,
                marginTop: 2,
                letterSpacing: -0.5,
              }}
            >
              {group.name}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 4,
                color: PALETTE.gold,
                textTransform: "uppercase",
              }}
            >
              {formatShareDate(date)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: PALETTE.muted,
                marginTop: 2,
              }}
            >
              {total} mortal{total === 1 ? "" : "s"} · strike limit {group.strikeLimit}
            </div>
          </div>
        </div>

        {/* Counts */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Pill label="Ascending" count={ascendingCount} color={PALETTE.divine} />
          <Pill label="Penitent" count={penitentCount} color={PALETTE.penitent} />
          <Pill label="Ascended" count={ascendedCount} color={PALETTE.ascended} />
          <Pill label="Fallen" count={fallenCount} color={PALETTE.fallen} />
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: 16,
            gap: 24,
          }}
        >
          {/* member list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1.4,
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                letterSpacing: 5,
                color: PALETTE.muted,
                textTransform: "uppercase",
              }}
            >
              The pantheon today
            </div>
            {visible.map((m) => {
              const tone = (() => {
                switch (m.status.status) {
                  case "ascending":
                    return { color: PALETTE.divine, bg: PALETTE.divineSoft };
                  case "ascended":
                    return { color: PALETTE.ascended, bg: PALETTE.ascendedSoft };
                  case "penitent":
                    return { color: PALETTE.penitent, bg: PALETTE.penitentSoft };
                  case "fallen":
                    return { color: PALETTE.fallen, bg: PALETTE.fallenSoft };
                  default:
                    return { color: PALETTE.muted, bg: "#ece5d0" };
                }
              })();
              const isFirst = firstToday?.user.id === m.user.id;
              return (
                <div
                  key={m.user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    backgroundColor: PALETTE.bgInner,
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 600,
                      color: PALETTE.fg,
                      flex: 1,
                    }}
                  >
                    {truncate(m.user.displayName, 22)}
                    {isFirst && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 8px",
                          backgroundColor: PALETTE.gold,
                          color: "#fff",
                          fontSize: 11,
                          letterSpacing: 3,
                          textTransform: "uppercase",
                          borderRadius: 3,
                        }}
                      >
                        First today
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14,
                      color: PALETTE.muted,
                      width: 130,
                      justifyContent: "flex-end",
                    }}
                  >
                    {m.status.currentStreak}d streak · {m.status.strikes} strk
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: 120,
                      justifyContent: "center",
                      padding: "4px 10px",
                      borderRadius: 3,
                      backgroundColor: tone.bg,
                      color: tone.color,
                      fontSize: 12,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.status.status === "ascended" && m.status.reclaimed
                      ? "Reclaimed"
                      : capitalize(m.status.status)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: m.hadAnyRiteToday
                        ? m.doneToday
                          ? PALETTE.ascended
                          : PALETTE.border
                        : "transparent",
                    }}
                  />
                </div>
              );
            })}
            {overflow > 0 && (
              <div
                style={{
                  display: "flex",
                  fontSize: 14,
                  color: PALETTE.muted,
                  fontStyle: "italic",
                  paddingTop: 4,
                }}
              >
                …and {overflow} more
              </div>
            )}
          </div>

          {/* highlights */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                letterSpacing: 5,
                color: PALETTE.muted,
                textTransform: "uppercase",
              }}
            >
              Today&apos;s chronicle
            </div>

            <Highlight
              label="First to keep all rites"
              body={
                firstToday
                  ? `${firstToday.user.displayName} — ${firstToday.at.toISOString().slice(11, 16)} UTC`
                  : "None yet — the day is still young."
              }
              accent={PALETTE.gold}
            />
            <Highlight
              label="Longest streak"
              body={
                longestStreak
                  ? `${longestStreak.user.displayName} — ${longestStreak.streak} day${longestStreak.streak === 1 ? "" : "s"}`
                  : "Awaiting a streak."
              }
              accent={PALETTE.divine}
            />
            <Highlight
              label="Outcomes shipped"
              body={
                shippedOutcomesToday.length === 0
                  ? "None today."
                  : shippedOutcomesToday
                      .slice(0, 2)
                      .map((o) => `${o.user.displayName}: ${truncate(o.label, 28)}`)
                      .join(" · ") +
                    (shippedOutcomesToday.length > 2
                      ? ` +${shippedOutcomesToday.length - 2} more`
                      : "")
              }
              accent={PALETTE.ascended}
            />
            {fallenToday.length > 0 && (
              <Highlight
                label="Fell today"
                body={fallenToday.map((u) => u.displayName).join(", ")}
                accent={PALETTE.fallen}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${PALETTE.border}`,
            paddingTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 14,
              letterSpacing: 6,
              color: PALETTE.gold,
              textTransform: "uppercase",
            }}
          >
            lome · the temple of ascent
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 3,
              color: PALETTE.muted,
              textTransform: "uppercase",
            }}
          >
            Each mortal is reckoned at dusk
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Pill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "10px 14px",
        backgroundColor: PALETTE.bgInner,
        border: `1px solid ${PALETTE.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 11,
          letterSpacing: 4,
          color,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 600,
          color: PALETTE.fg,
          marginTop: 2,
        }}
      >
        {count}
      </div>
    </div>
  );
}

function Highlight({
  label,
  body,
  accent,
}: {
  label: string;
  body: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "10px 14px",
        backgroundColor: PALETTE.bgInner,
        border: `1px solid ${PALETTE.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 11,
          letterSpacing: 4,
          color: PALETTE.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 17,
          color: PALETTE.fg,
          marginTop: 3,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fallback(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PALETTE.bg,
          color: PALETTE.muted,
          fontFamily: "Georgia, serif",
          fontSize: 36,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {message}
      </div>
    ),
    { ...size },
  );
}
