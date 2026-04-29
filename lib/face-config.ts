// Inlined djb2-ish hash: importing `stringHash` from `facehash` pulls in the
// rest of the package, which calls `React.createContext` at module load and
// breaks any server action that touches face-config (TypeError on POST).
function stringHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h &= h;
  }
  return Math.abs(h);
}

export const FACE_COLOR_CLASSES = [
  "bg-amber-500 dark:bg-amber-600",
  "bg-rose-500 dark:bg-rose-600",
  "bg-violet-500 dark:bg-violet-600",
  "bg-sky-500 dark:bg-sky-600",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-fuchsia-500 dark:bg-fuchsia-600",
] as const;

export const FACE_COLOR_SWATCHES = [
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#d946ef",
] as const;

export const FACE_STYLE_LABELS = [
  "Round",
  "Cross",
  "Line",
  "Curved",
] as const;

export const FACE_GAZES = [
  { x: -1, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
] as const;

export const FACE_DEPTHS = ["none", "subtle", "medium", "dramatic"] as const;
export type FaceDepth = (typeof FACE_DEPTHS)[number];

export const FACE_STYLE_COUNT = FACE_STYLE_LABELS.length;
export const FACE_COLOR_COUNT = FACE_COLOR_CLASSES.length;
export const FACE_GAZE_COUNT = FACE_GAZES.length;
export const FACE_DEPTH_COUNT = FACE_DEPTHS.length;

const DEFAULT_DEPTH_INDEX = FACE_DEPTHS.indexOf("subtle");

export interface FaceCustomization {
  faceStyle: number | null;
  faceColor: number | null;
  faceGaze: number | null;
  faceDepth: number | null;
}

export interface ResolvedFace {
  styleIndex: number;
  colorIndex: number;
  gazeIndex: number;
  depthIndex: number;
}

export function resolveFace(
  name: string,
  customization: FaceCustomization,
): ResolvedFace {
  const seed = stringHash(name || "?");
  return {
    styleIndex:
      clampOrNull(customization.faceStyle, FACE_STYLE_COUNT) ??
      seed % FACE_STYLE_COUNT,
    colorIndex:
      clampOrNull(customization.faceColor, FACE_COLOR_COUNT) ??
      seed % FACE_COLOR_COUNT,
    gazeIndex:
      clampOrNull(customization.faceGaze, FACE_GAZE_COUNT) ??
      seed % FACE_GAZE_COUNT,
    depthIndex:
      clampOrNull(customization.faceDepth, FACE_DEPTH_COUNT) ??
      DEFAULT_DEPTH_INDEX,
  };
}

function clampOrNull(value: number | null | undefined, length: number) {
  if (value == null) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value >= length) return null;
  return value;
}
