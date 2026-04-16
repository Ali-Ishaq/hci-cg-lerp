import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCanvasPoint, renderCanvasScene } from "./canvasUtils";
import {
  ANIMATION_SPEED,
  clamp,
  computeInterpolatedPolyline,
  MIN_VERTICES,
  PHASE,
  T_STEP,
} from "./lerpUtils";

function App() {
  // 1. State and constants
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(0);
  const previousFrameTimeRef = useRef(0);
  const animationDirectionRef = useRef(1);

  const [phase, setPhase] = useState(PHASE.SETUP);
  const [vertexInput, setVertexInput] = useState("4");
  const [vertexCount, setVertexCount] = useState(0);
  const [polylineA, setPolylineA] = useState([]);
  const [polylineB, setPolylineB] = useState([]);
  const [t, setT] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const isTweening = phase === PHASE.TWEENING;

  const pointsRemainingA = Math.max(vertexCount - polylineA.length, 0);
  const pointsRemainingB = Math.max(vertexCount - polylineB.length, 0);

  const phaseLabel =
    phase === PHASE.SETUP
      ? "Setup"
      : phase === PHASE.DRAWING_A
        ? "Drawing Polyline A"
        : phase === PHASE.DRAWING_B
          ? "Drawing Polyline B"
          : "Tweening";

  const instructionText =
    phase === PHASE.SETUP
      ? "Enter a vertex count and confirm to begin."
      : phase === PHASE.DRAWING_A
        ? "Left click to place vertices for Polyline A."
        : phase === PHASE.DRAWING_B
          ? "Left click to place vertices for Polyline B."
          : "Use Left/Right arrows to change t. Press A or click Toggle Animation.";

  const toggleAnimation = useCallback(() => {
    if (!isTweening) {
      return;
    }

    if (t >= 1) {
      animationDirectionRef.current = -1;
    } else if (t <= 0) {
      animationDirectionRef.current = 1;
    }

    setIsAnimating((previous) => !previous);
  }, [isTweening, t]);

  const handleConfirmVertices = useCallback(
    (event) => {
      event.preventDefault();

      const parsedValue = Number.parseInt(vertexInput, 10);
      const safeVertexCount = Number.isFinite(parsedValue)
        ? Math.max(MIN_VERTICES, parsedValue)
        : MIN_VERTICES;

      setVertexInput(String(safeVertexCount));
      setVertexCount(safeVertexCount);
      setPolylineA([]);
      setPolylineB([]);
      setT(0);
      setIsAnimating(false);
      animationDirectionRef.current = 1;
      setPhase(PHASE.DRAWING_A);
    },
    [vertexInput],
  );

  // 2. Drawing logic (click handler)
  const handleCanvasClick = useCallback(
    (event) => {
      if (phase !== PHASE.DRAWING_A && phase !== PHASE.DRAWING_B) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const point = getCanvasPoint(event, canvas);
      if (!point) {
        return;
      }

      if (phase === PHASE.DRAWING_A) {
        setPolylineA((previous) => {
          if (previous.length >= vertexCount) {
            return previous;
          }

          return [...previous, point];
        });
        return;
      }

      setPolylineB((previous) => {
        if (previous.length >= vertexCount) {
          return previous;
        }

        return [...previous, point];
      });
    },
    [phase, vertexCount],
  );

  useEffect(() => {
    if (
      phase === PHASE.DRAWING_A &&
      vertexCount > 0 &&
      polylineA.length >= vertexCount
    ) {
      setPhase(PHASE.DRAWING_B);
    }
  }, [phase, polylineA.length, vertexCount]);

  useEffect(() => {
    if (
      phase === PHASE.DRAWING_B &&
      vertexCount > 0 &&
      polylineB.length >= vertexCount
    ) {
      setPhase(PHASE.TWEENING);
    }
  }, [phase, polylineB.length, vertexCount]);

  // 3. LERP computation function
  const interpolatedPolyline = useMemo(
    () => computeInterpolatedPolyline(polylineA, polylineB, t),
    [polylineA, polylineB, t],
  );

  // 4. Animation loop (useEffect with requestAnimationFrame)
  useEffect(() => {
    if (!isTweening || !isAnimating) {
      return undefined;
    }

    previousFrameTimeRef.current = 0;

    const step = (timestamp) => {
      if (previousFrameTimeRef.current === 0) {
        previousFrameTimeRef.current = timestamp;
      }

      const deltaSeconds = (timestamp - previousFrameTimeRef.current) / 1000;
      previousFrameTimeRef.current = timestamp;

      setT((currentT) => {
        let nextT =
          currentT +
          animationDirectionRef.current * ANIMATION_SPEED * deltaSeconds;

        if (nextT >= 1) {
          nextT = 1;
          animationDirectionRef.current = -1;
        } else if (nextT <= 0) {
          nextT = 0;
          animationDirectionRef.current = 1;
        }

        return nextT;
      });

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      previousFrameTimeRef.current = 0;
    };
  }, [isAnimating, isTweening]);

  // 5. Key event handlers
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isTweening) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setT((currentT) => {
          const nextT = clamp(currentT + T_STEP, 0, 1);
          if (nextT === 1) {
            animationDirectionRef.current = -1;
          }
          return nextT;
        });
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setT((currentT) => {
          const nextT = clamp(currentT - T_STEP, 0, 1);
          if (nextT === 0) {
            animationDirectionRef.current = 1;
          }
          return nextT;
        });
        return;
      }

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        toggleAnimation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTweening, toggleAnimation]);

  // 6. Canvas rendering (useEffect that redraws on state change)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    renderCanvasScene({
      canvas,
      polylineA,
      polylineB,
      interpolatedPolyline,
      showInterpolated: isTweening,
    });
  }, [isTweening, polylineA, polylineB, interpolatedPolyline]);

  // 7. JSX / UI
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0%,_#f8fafc_38%,_#e2e8f0_100%)] px-4 py-6 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            LERP and Tweening Canvas Demo
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Draw two equal-vertex polylines, then interpolate between them.
          </p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Phase
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {phaseLabel}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Interpolation
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              t = {t.toFixed(2)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Animation
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {isAnimating ? "On" : "Off"}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
          <p className="text-sm font-medium text-slate-700">
            {instructionText}
          </p>

          {phase === PHASE.SETUP ? (
            <form
              onSubmit={handleConfirmVertices}
              className="mt-4 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  How many vertices per polyline?
                </span>
                <input
                  type="number"
                  min={MIN_VERTICES}
                  step="1"
                  value={vertexInput}
                  onChange={(event) => setVertexInput(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  required
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Confirm
              </button>
            </form>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {phase === PHASE.DRAWING_A && (
                <div className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  Polyline A - Click {pointsRemainingA} more points
                </div>
              )}

              {phase === PHASE.DRAWING_B && (
                <div className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
                  Polyline B - Click {pointsRemainingB} more points
                </div>
              )}

              {isTweening && (
                <button
                  type="button"
                  onClick={toggleAnimation}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Toggle Animation
                </button>
              )}
            </div>
          )}
        </section>

        {phase !== PHASE.SETUP && (
          <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur">
            <div className="mb-3 flex flex-wrap items-center gap-4 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Polyline A
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                Polyline B
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                Interpolated
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="h-[70vh] w-full rounded-xl border border-slate-300 bg-white shadow-inner shadow-slate-200/60"
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
