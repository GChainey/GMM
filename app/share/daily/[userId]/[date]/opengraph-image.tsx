import { ImageResponse } from "next/og";
import {
  formatShareDate,
  getPersonalDailyShareData,
} from "@/lib/share-data";

export const alt = "Daily rite — God Mode May";
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
  params: Promise<{ userId: string; date: string }>;
}

export default async function OgDailyImage({ params }: Props) {
  const { userId, date } = await params;
  const data = await getPersonalDailyShareData(userId, date);

  if (!data) {
    return fallbackImage("No rite to share");
  }

  const {
    user,
    group,
    pledge,
    acts,
    todayCheckins,
    journalBody,
    photoUrl,
    status,
    doneToday,
    totalToday,
    monthlyDone,
  } = data;

  const dailyActs = acts.filter((a) => a.kind === "do" || a.kind === "abstain");
  const completedSet = new Set(
    todayCheckins.filter((c) => c.completed).map((c) => c.activityId),
  );

  const statusToken = (() => {
    switch (status.status) {
      case "ascending":
        return { label: "Ascending", color: PALETTE.divine, bg: PALETTE.divineSoft };
      case "ascended":
        return { label: status.reclaimed ? "Reclaimed" : "Ascended", color: PALETTE.ascended, bg: PALETTE.ascendedSoft };
      case "penitent":
        return { label: "Penitent", color: PALETTE.penitent, bg: PALETTE.penitentSoft };
      case "fallen":
        return { label: "Fallen", color: PALETTE.fallen, bg: PALETTE.fallenSoft };
      default:
        return { label: "Awaiting", color: PALETTE.muted, bg: "#ece5d0" };
    }
  })();

  const journalExcerpt = (journalBody || "").trim().slice(0, 240);

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
            "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 50%), radial-gradient(circle at bottom right, rgba(199,155,63,0.18), transparent 60%)",
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
              GOD MODE MAY · DAILY RITE
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: PALETTE.fg,
                marginTop: 4,
                letterSpacing: 1,
              }}
            >
              {group.name}
            </div>
          </div>
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
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: 24,
            gap: 32,
          }}
        >
          {/* LEFT */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1.35,
              gap: 16,
            }}
          >
            {/* name + status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 44,
                  fontWeight: 600,
                  color: PALETTE.fg,
                  letterSpacing: -0.5,
                }}
              >
                {truncate(user.displayName, 22)}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 16px",
                  borderRadius: 4,
                  border: `1px solid ${statusToken.color}55`,
                  backgroundColor: statusToken.bg,
                  color: statusToken.color,
                  fontSize: 16,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                }}
              >
                {statusToken.label}
              </div>
            </div>

            {/* meta line */}
            <div
              style={{
                display: "flex",
                gap: 20,
                fontSize: 18,
                color: PALETTE.muted,
              }}
            >
              <div style={{ display: "flex" }}>{status.currentStreak}-day streak</div>
              <div style={{ display: "flex" }}>· {status.strikes} strike{status.strikes === 1 ? "" : "s"}</div>
              <div style={{ display: "flex" }}>· {doneToday}/{totalToday} rites today</div>
            </div>

            {/* pledge */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 20px",
                backgroundColor: PALETTE.bgInner,
                border: `1px solid ${PALETTE.border}`,
                borderLeft: `4px solid ${PALETTE.gold}`,
                borderRadius: 4,
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
                The pledge
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontStyle: "italic",
                  color: PALETTE.fg,
                  marginTop: 4,
                }}
              >
                {truncate(pledge.pledgeText || "—", 180)}
              </div>
            </div>

            {/* rites */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 12,
                  letterSpacing: 5,
                  color: PALETTE.muted,
                  textTransform: "uppercase",
                }}
              >
                Today&apos;s rites
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {dailyActs.slice(0, 6).map((a) => {
                  const done = completedSet.has(a.id);
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        borderRadius: 4,
                        border: `1px solid ${done ? PALETTE.ascended + "66" : PALETTE.border}`,
                        backgroundColor: done ? PALETTE.ascendedSoft : PALETTE.bgInner,
                        color: done ? PALETTE.ascended : PALETTE.muted,
                        fontSize: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: done ? PALETTE.ascended : PALETTE.border,
                        }}
                      />
                      {truncate(a.label, 28)}
                      {a.kind === "abstain" ? " (abstain)" : ""}
                    </div>
                  );
                })}
                {dailyActs.length > 6 && (
                  <div
                    style={{
                      display: "flex",
                      padding: "6px 12px",
                      fontSize: 16,
                      color: PALETTE.muted,
                    }}
                  >
                    +{dailyActs.length - 6} more
                  </div>
                )}
                {dailyActs.length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 16,
                      fontStyle: "italic",
                      color: PALETTE.muted,
                    }}
                  >
                    No daily rites — only tallies.
                  </div>
                )}
              </div>
            </div>

            {/* monthly tallies */}
            {monthlyDone.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {monthlyDone.slice(0, 2).map((mp) => {
                  const pct = Math.min(100, Math.round(mp.ratio * 100));
                  return (
                    <div
                      key={mp.activityId}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "8px 12px",
                        backgroundColor: PALETTE.goldSoft + "55",
                        border: `1px solid ${PALETTE.gold}55`,
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                        }}
                      >
                        <div style={{ display: "flex" }}>{truncate(mp.label, 28)}</div>
                        <div style={{ display: "flex", color: PALETTE.muted }}>
                          {mp.total}{mp.unit ? ` ${mp.unit}` : ""} / {mp.target}{mp.unit ? ` ${mp.unit}` : ""} · {pct}%
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          height: 6,
                          marginTop: 4,
                          backgroundColor: PALETTE.border,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            width: `${pct}%`,
                            height: 6,
                            backgroundColor: mp.reached ? PALETTE.ascended : PALETTE.gold,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* journal */}
            {journalExcerpt && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 12,
                    letterSpacing: 5,
                    color: PALETTE.muted,
                    textTransform: "uppercase",
                  }}
                >
                  The journal
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 16,
                    fontStyle: "italic",
                    color: PALETTE.fg,
                    lineHeight: 1.45,
                  }}
                >
                  &ldquo;{journalExcerpt}{journalBody.length > 240 ? "…" : ""}&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — photo or seal */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 16,
            }}
          >
            {photoUrl ? (
              <div
                style={{
                  display: "flex",
                  width: 380,
                  height: 380,
                  borderRadius: 6,
                  overflow: "hidden",
                  border: `2px solid ${PALETTE.gold}`,
                  boxShadow: "0 6px 18px rgba(50, 35, 10, 0.15)",
                }}
              >
                <img
                  src={photoUrl}
                  alt="proof of rite"
                  width={380}
                  height={380}
                  style={{ objectFit: "cover", width: 380, height: 380 }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 380,
                  height: 380,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 6,
                  backgroundColor: PALETTE.bgInner,
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
                  May progress
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    width: 280,
                    marginTop: 16,
                    gap: 4,
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = `2026-05-${String(i + 1).padStart(2, "0")}`;
                    const cell = data.cells.get(d);
                    const tone =
                      cell?.state === "done"
                        ? PALETTE.gold
                        : cell?.state === "missed"
                          ? PALETTE.fallen
                          : cell?.state === "pending"
                            ? PALETTE.divineSoft
                            : "#e6dfc8";
                    const fg =
                      cell?.state === "done" || cell?.state === "missed"
                        ? "#fff"
                        : PALETTE.muted;
                    return (
                      <div
                        key={d}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          backgroundColor: tone,
                          color: fg,
                          fontSize: 14,
                          borderRadius: 3,
                        }}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: PALETTE.muted,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {photoUrl ? "Proof of rite" : "Thirty-one days, May"}
            </div>
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
            May the gods watch
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function fallbackImage(message: string) {
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

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
