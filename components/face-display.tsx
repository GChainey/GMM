"use client";

import { FACES } from "facehash";

import { cn } from "@/lib/utils";
import {
  FACE_COLOR_CLASSES,
  FACE_DEPTHS,
  FACE_GAZES,
  FACE_STYLE_COUNT,
  type ResolvedFace,
} from "@/lib/face-config";

const DEPTH_SETTINGS = {
  none: { rotateRange: 0, translateZ: 0, perspective: "none" },
  subtle: { rotateRange: 5, translateZ: 4, perspective: "800px" },
  medium: { rotateRange: 10, translateZ: 8, perspective: "500px" },
  dramatic: { rotateRange: 15, translateZ: 12, perspective: "300px" },
} as const;

// In container-query units, so the gaze offset scales with face size instead
// of the inner SVG's much smaller bounding box.
const GAZE_TRANSLATE_CQ = 5;

const GRADIENT_OVERLAY: React.CSSProperties = {
  background:
    "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.18) 0%, transparent 60%)",
};

interface FaceDisplayProps {
  face: ResolvedFace;
  initial?: string;
  enableBlink?: boolean;
  showInitial?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function FaceDisplay({
  face,
  initial = "",
  enableBlink = true,
  showInitial = true,
  className,
  style,
}: FaceDisplayProps) {
  const FaceComponent =
    FACES[face.styleIndex % FACE_STYLE_COUNT] ?? FACES[0];
  const colorClass = FACE_COLOR_CLASSES[face.colorIndex] ?? FACE_COLOR_CLASSES[0];
  const gaze = FACE_GAZES[face.gazeIndex] ?? FACE_GAZES[5];
  const depth = DEPTH_SETTINGS[FACE_DEPTHS[face.depthIndex] ?? "subtle"];
  // Depth tilts the face in 3D. gaze.x → rotateY (look left/right) and gaze.y
  // → rotateX (look up/down); rotateY is negated so positive gaze.x reads as
  // "looking right" instead of "looking left".
  const tiltTransform =
    depth.rotateRange === 0
      ? undefined
      : `rotateX(${gaze.y * depth.rotateRange}deg) rotateY(${
          -gaze.x * depth.rotateRange
        }deg) translateZ(${depth.translateZ}px)`;
  // Gaze always nudges the eyes within the face, so the rail is visible even
  // when 3D depth is "none".
  const gazeTransform = `translate(${gaze.x * GAZE_TRANSLATE_CQ}cqw, ${
    gaze.y * GAZE_TRANSLATE_CQ
  }cqh)`;

  const blinkTimings = enableBlink
    ? {
        left: { delay: 0.4, duration: 4.2 },
        right: { delay: 1.7, duration: 4.6 },
      }
    : undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        colorClass,
        className,
      )}
      style={{
        containerType: "size",
        ...(depth.rotateRange !== 0 && {
          perspective: depth.perspective,
          transformStyle: "preserve-3d",
        }),
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={GRADIENT_OVERLAY}
      />
      <div
        className="absolute inset-0 z-[2] flex flex-col items-center justify-center"
        style={{
          transform: tiltTransform,
          transformStyle: depth.rotateRange === 0 ? undefined : "preserve-3d",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <FaceComponent
          enableBlink={enableBlink}
          blinkTimings={blinkTimings}
          style={{
            width: "60%",
            height: "auto",
            maxWidth: "90%",
            maxHeight: "40%",
            transform: gazeTransform,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        {showInitial && initial ? (
          <span
            style={{
              marginTop: "8%",
              fontSize: "26cqw",
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        ) : null}
      </div>
    </div>
  );
}
