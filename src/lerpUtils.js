export const PHASE = Object.freeze({
  SETUP: "setup",
  DRAWING_A: "drawing-a",
  DRAWING_B: "drawing-b",
  TWEENING: "tweening",
});

export const MIN_VERTICES = 2;
export const T_STEP = 0.05;
export const ANIMATION_SPEED = 0.6;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeInterpolatedPolyline(polylineA, polylineB, t) {
  if (polylineA.length === 0 || polylineA.length !== polylineB.length) {
    return [];
  }

  return polylineA.map((pointA, index) => {
    const pointB = polylineB[index];
    return {
      x: pointA.x + t * (pointB.x - pointA.x),
      y: pointA.y + t * (pointB.y - pointA.y),
    };
  });
}
