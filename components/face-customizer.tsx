"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FaceDisplay } from "@/components/face-display";
import { cn } from "@/lib/utils";
import {
  FACE_COLOR_CLASSES,
  FACE_COLOR_COUNT,
  FACE_COLOR_SWATCHES,
  FACE_DEPTHS,
  FACE_DEPTH_COUNT,
  FACE_GAZES,
  FACE_GAZE_COUNT,
  FACE_STYLE_COUNT,
  FACE_STYLE_LABELS,
  resolveFace,
  type FaceCustomization,
} from "@/lib/face-config";
import {
  resetFaceCustomizationAction,
  updateFaceCustomizationAction,
} from "@/app/(app)/profile/actions";

interface FaceCustomizerProps {
  name: string;
  initial: FaceCustomization;
}

export function FaceCustomizer({ name, initial }: FaceCustomizerProps) {
  const safeName = name || "?";
  const initialResolved = useMemo(
    () => resolveFace(safeName, initial),
    [safeName, initial],
  );

  const [styleIdx, setStyleIdx] = useState<number>(initialResolved.styleIndex);
  const [colorIdx, setColorIdx] = useState<number>(initialResolved.colorIndex);
  const [gazeIdx, setGazeIdx] = useState<number>(initialResolved.gazeIndex);
  const [depthIdx, setDepthIdx] = useState<number>(initialResolved.depthIndex);
  const [savedSnapshot, setSavedSnapshot] = useState({
    styleIdx: initialResolved.styleIndex,
    colorIdx: initialResolved.colorIndex,
    gazeIdx: initialResolved.gazeIndex,
    depthIdx: initialResolved.depthIndex,
  });
  const [savedAuto, setSavedAuto] = useState(
    initial.faceStyle == null &&
      initial.faceColor == null &&
      initial.faceGaze == null &&
      initial.faceDepth == null,
  );
  const [saving, startSaving] = useTransition();
  const [resetting, startReset] = useTransition();

  const dirty =
    savedAuto ||
    styleIdx !== savedSnapshot.styleIdx ||
    colorIdx !== savedSnapshot.colorIdx ||
    gazeIdx !== savedSnapshot.gazeIdx ||
    depthIdx !== savedSnapshot.depthIdx;

  const previewFace = {
    styleIndex: styleIdx,
    colorIndex: colorIdx,
    gazeIndex: gazeIdx,
    depthIndex: depthIdx,
  };

  function handleSave() {
    startSaving(async () => {
      try {
        await updateFaceCustomizationAction({
          faceStyle: styleIdx,
          faceColor: colorIdx,
          faceGaze: gazeIdx,
          faceDepth: depthIdx,
        });
        setSavedSnapshot({ styleIdx, colorIdx, gazeIdx, depthIdx });
        setSavedAuto(false);
        toast.success("Visage carved in marble.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save";
        toast.error(msg);
      }
    });
  }

  function handleReset() {
    startReset(async () => {
      try {
        await resetFaceCustomizationAction();
        const auto = resolveFace(safeName, {
          faceStyle: null,
          faceColor: null,
          faceGaze: null,
          faceDepth: null,
        });
        setStyleIdx(auto.styleIndex);
        setColorIdx(auto.colorIndex);
        setGazeIdx(auto.gazeIndex);
        setDepthIdx(auto.depthIndex);
        setSavedSnapshot({
          styleIdx: auto.styleIndex,
          colorIdx: auto.colorIndex,
          gazeIdx: auto.gazeIndex,
          depthIdx: auto.depthIndex,
        });
        setSavedAuto(true);
        toast.success("The gods have chosen anew.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not reset";
        toast.error(msg);
      }
    });
  }

  const initial0 = safeName.charAt(0).toUpperCase();
  const busy = saving || resetting;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
        <FaceDisplay
          face={previewFace}
          initial={initial0}
          enableBlink
          className="h-32 w-32 rounded-full ring-2 ring-gold/50"
        />
        <div className="text-center sm:text-left">
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            LIVE PREVIEW
          </p>
          <p className="mt-1 font-display text-2xl">Sculpt thy visage</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag the rails to reshape eyes, hue, gaze, and depth.
          </p>
        </div>
      </div>

      <SliderRail
        label="Eye Shape"
        valueLabel={FACE_STYLE_LABELS[styleIdx] ?? "—"}
        count={FACE_STYLE_COUNT}
        value={styleIdx}
        onChange={setStyleIdx}
        renderStop={(idx, isActive) => (
          <FaceDisplay
            face={{
              styleIndex: idx,
              colorIndex: colorIdx,
              gazeIndex: 5,
              depthIndex: 0,
            }}
            initial=""
            showInitial={false}
            enableBlink={false}
            className={cn(
              "h-10 w-10 rounded-full",
              isActive ? "ring-2 ring-gold" : "ring-1 ring-border/50",
            )}
          />
        )}
      />

      <SliderRail
        label="Hue"
        valueLabel={`Color ${colorIdx + 1} of ${FACE_COLOR_COUNT}`}
        count={FACE_COLOR_COUNT}
        value={colorIdx}
        onChange={setColorIdx}
        renderStop={(idx, isActive) => (
          <span
            className={cn(
              "block h-8 w-8 rounded-full",
              FACE_COLOR_CLASSES[idx],
              isActive
                ? "ring-2 ring-offset-2 ring-offset-background ring-gold"
                : "ring-1 ring-border/50",
            )}
            style={{
              backgroundColor: FACE_COLOR_SWATCHES[idx],
            }}
          />
        )}
      />

      <GazeGrid value={gazeIdx} onChange={setGazeIdx} />

      <SliderRail
        label="3D Depth"
        valueLabel={FACE_DEPTHS[depthIdx] ?? "—"}
        count={FACE_DEPTH_COUNT}
        value={depthIdx}
        onChange={setDepthIdx}
        renderStop={(idx, isActive) => (
          <span
            className={cn(
              "flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium capitalize",
              isActive
                ? "border-gold/70 bg-gold/15 text-foreground"
                : "border-border/60 bg-background/60 text-muted-foreground",
            )}
          >
            {FACE_DEPTHS[idx]}
          </span>
        )}
      />

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={busy || !dirty}
          className="gilded font-display tracking-widest"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {saving ? "Sculpting…" : "Save visage"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={busy}
          className="font-display tracking-widest"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          {resetting ? "Restoring…" : "Restore default"}
        </Button>
      </div>
    </div>
  );
}

interface SliderRailProps {
  label: string;
  valueLabel: string;
  count: number;
  value: number;
  onChange: (next: number) => void;
  renderStop: (index: number, isActive: boolean) => React.ReactNode;
}

function SliderRail({
  label,
  valueLabel,
  count,
  value,
  onChange,
  renderStop,
}: SliderRailProps) {
  const id = `face-slider-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="font-display text-xs tracking-[0.3em] text-muted-foreground"
        >
          {label.toUpperCase()}
        </label>
        <span className="text-xs capitalize text-muted-foreground">
          {valueLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: count }).map((_, idx) => {
          const isActive = idx === value;
          return (
            <button
              key={idx}
              type="button"
              aria-label={`${label} option ${idx + 1}`}
              aria-pressed={isActive}
              onClick={() => onChange(idx)}
              className="group relative cursor-pointer rounded-full p-0.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              {renderStop(idx, isActive)}
            </button>
          );
        })}
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={count - 1}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--color-gold)]"
      />
    </div>
  );
}

function GazeGrid({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const cells: { gridIndex: number; gazeIndex: number | null }[] = [];
  const gazeByCoord = new Map<string, number>();
  for (let i = 0; i < FACE_GAZE_COUNT; i++) {
    const g = FACE_GAZES[i];
    gazeByCoord.set(`${g.x},${g.y}`, i);
  }
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const gridIndex = (y + 1) * 3 + (x + 1);
      const gazeIndex = gazeByCoord.get(`${x},${y}`) ?? null;
      cells.push({ gridIndex, gazeIndex });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xs tracking-[0.3em] text-muted-foreground">
          GAZE
        </span>
        <span className="text-xs text-muted-foreground">
          Direction {value + 1} of {FACE_GAZE_COUNT}
        </span>
      </div>
      <div className="inline-grid w-fit grid-cols-3 gap-1.5 rounded-xl border border-border/60 bg-background/50 p-2">
        {cells.map(({ gridIndex, gazeIndex }) => {
          if (gazeIndex == null) {
            return (
              <span
                key={gridIndex}
                aria-hidden="true"
                className="block h-7 w-7"
              />
            );
          }
          const isActive = gazeIndex === value;
          return (
            <button
              key={gridIndex}
              type="button"
              aria-label={`Gaze direction ${gazeIndex + 1}`}
              aria-pressed={isActive}
              onClick={() => onChange(gazeIndex)}
              className={cn(
                "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                isActive
                  ? "border-gold bg-gold/15"
                  : "border-border/50 bg-background hover:border-border",
              )}
            >
              <span
                className={cn(
                  "block h-2 w-2 rounded-full",
                  isActive ? "bg-gold" : "bg-muted-foreground/60",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
