"use client";
/** Living-heart effects, all driven by the patient's own data (CSV or form).
 *
 *  Data → visuals map (single source of truth: flowParams):
 *  - pr (pulse) ......... beat tempo + base flow speed
 *  - ef_tte (ejection) .. beat strength + flow vigor (weak EF = weak beat)
 *  - wbc (white cells) .. how many white cells drift inside
 *  - hb (hemoglobin) .... red-cell tint (low Hb = paler, dimmer red)
 *  - vessel probability . flow slows in tighter arteries (reduced perfusion)
 *  Everything is illustrative — a feel for the numbers, never a measurement.
 *
 *  Motion collapses to stillness under prefers-reduced-motion.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ARTERY_PATHS } from "@/lib/arteries";
import { useStore } from "@/store/VesselVisionContext";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function pulseRate(inputs: Record<string, number | string>): number {
  const pr = inputs.pr;
  return typeof pr === "number" && pr > 20 && pr < 220 ? pr : 72;
}

export interface FlowParams {
  pr: number;
  efFactor: number;
  /** Relative flow speed: 1 = typical. */
  speed: number;
  /** White cells to show, from WBC. */
  wbcCells: number;
  /** Red-cell tint + dim inflow tint, as CSS colors. */
  red: string;
  redDim: string;
  /** Beat amplitude. */
  beat: number;
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function flowParams(inputs: Record<string, number | string>): FlowParams {
  const pr = pulseRate(inputs);
  const ef = typeof inputs.ef_tte === "number" ? inputs.ef_tte : null;
  const efFactor = ef === null || ef >= 55 ? 1 : clamp(0.55 + (0.45 * (ef - 20)) / 35, 0.55, 1);
  const wbc = typeof inputs.wbc === "number" ? inputs.wbc : null;
  const wbcCells = wbc === null ? 6 : Math.round(clamp(3 + ((wbc - 3000) / 12000) * 9, 3, 12));
  const hb = typeof inputs.hb === "number" ? inputs.hb : null;
  const pale = hb === null || hb >= 12 ? 0 : clamp((12 - hb) / 5, 0, 1);
  return {
    pr,
    efFactor,
    speed: (pr / 72) * efFactor,
    wbcCells,
    red: mix([255, 106, 94], [201, 141, 125], pale),
    redDim: mix([176, 64, 56], [150, 110, 100], pale),
    beat: 0.028 * efFactor,
  };
}

/** Edit gulp: set to 1 whenever inputs change; FlowStreams drink it as a
 *  temporary surge, then it decays. Module-local on purpose — one canvas
 *  at a time ever reads it. */
const editPulse = { v: 0 };

/** Snapshot bridge: the rail button arms this, SnapshotTaker (inside the
 *  Canvas) captures the next frame and downloads it. Needs
 *  preserveDrawingBuffer on the Canvas, set in HeartScene. */
export const snapshotRequest = { pending: false };

export function SnapshotTaker() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    if (!snapshotRequest.pending) return;
    snapshotRequest.pending = false;
    try {
      const url = gl.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "vesselvision-heart.png";
      a.click();
    } catch {
      /* canvas tainted or unavailable: silent no-op */
    }
  });
  return null;
}

export function Heartbeat({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { inputs } = useStore();
  const pr = pulseRate(inputs);
  const beat = flowParams(inputs).beat;
  const reduce = useMemo(() => prefersReducedMotion(), []);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (reduce) {
      g.scale.setScalar(1);
      return;
    }
    // Lub-dub: sharp systolic peak, soft diastole.
    const t = clock.elapsedTime * (pr / 60) * Math.PI * 2;
    const pulse = Math.pow(Math.max(0, Math.sin(t)), 3);
    g.scale.setScalar(1 + beat * pulse);
  });
  return <group ref={ref}>{children}</group>;
}

/** One smooth stream: elongated glow streaks chasing each other along a
 *  curve, dense enough to read as flowing liquid, not dots. */
function FlowStream({
  points,
  color,
  speed,
  count,
  size,
  opacity,
}: {
  points: [number, number, number][];
  color: string;
  /** Curve traversals per second. */
  speed: number;
  count: number;
  size: number;
  opacity: number;
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, opacity],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  const offsets = useMemo(
    () => Array.from({ length: count }, (_, i) => i / count),
    [count],
  );
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tan = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const span = curve.getLength() || 1;
    const rate = (speed * (1 + 0.9 * editPulse.v)) / span;
    for (let i = 0; i < offsets.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const t = (offsets[i] + clock.elapsedTime * rate) % 1;
      curve.getPointAt(t, pos);
      curve.getTangentAt(t, tan);
      m.position.copy(pos);
      ahead.copy(pos).add(tan);
      m.lookAt(ahead);
      m.scale.set(size, size, size * 3.4);
      m.visible = t < 0.985;
    }
  });

  return (
    <group>
      {offsets.map((o, i) => (
        <mesh
          key={o}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geo}
          material={mat}
        />
      ))}
    </group>
  );
}

const CHAMBER_RED = 40;
const CHAMBER_WHITE_MAX = 12;
const CHAMBER_CENTER: [number, number, number] = [0, 0.02, 0.02];

/** Inside the heart: red cells swirling in the chambers, white cells (count
 *  from WBC) drifting slow and wide among them. Energy (from the CAD
 *  output) brightens and quickens the whole suspension. */
function ChamberSwirl({ fp, energy }: { fp: FlowParams; energy: number }) {
  const reds = useRef<(THREE.Mesh | null)[]>([]);
  const whites = useRef<(THREE.Mesh | null)[]>([]);

  const redGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const redMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: fp.red,
        transparent: true,
        opacity: Math.min(1, 0.5 * energy),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [fp.red, energy],
  );
  const whiteMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#f2ede2",
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      redGeo.dispose();
      redMat.dispose();
      whiteMat.dispose();
    },
    [redGeo, redMat, whiteMat],
  );

  const redSeeds = useMemo(
    () =>
      Array.from({ length: CHAMBER_RED }, (_, i) => ({
        phase: (i / CHAMBER_RED) * Math.PI * 2,
        r: 0.55 + ((i * 37) % 10) / 10 * 0.45,
        tilt: (((i * 53) % 20) - 10) / 10,
        pace: 0.7 + ((i * 29) % 10) / 10 * 0.6,
      })),
    [],
  );
  const whiteSeeds = useMemo(
    () =>
      Array.from({ length: CHAMBER_WHITE_MAX }, (_, i) => ({
        phase: (i / CHAMBER_WHITE_MAX) * Math.PI * 2,
        r: 0.7 + ((i * 41) % 10) / 10 * 0.3,
        pace: 0.25 + ((i * 17) % 10) / 10 * 0.2,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * fp.speed * (0.85 + 0.3 * energy);
    for (let i = 0; i < redSeeds.length; i++) {
      const m = reds.current[i];
      if (!m) continue;
      const s = redSeeds[i];
      const a = s.phase + t * s.pace;
      m.position.set(
        CHAMBER_CENTER[0] + Math.cos(a) * 0.36 * s.r,
        CHAMBER_CENTER[1] + Math.sin(a * 0.9 + s.phase) * 0.5 * s.r + s.tilt * 0.08,
        CHAMBER_CENTER[2] + Math.sin(a) * 0.31 * s.r,
      );
      m.scale.setScalar(0.02);
    }
    for (let i = 0; i < whiteSeeds.length; i++) {
      const m = whites.current[i];
      if (!m) continue;
      m.visible = i < fp.wbcCells;
      if (!m.visible) continue;
      const s = whiteSeeds[i];
      const a = s.phase + t * s.pace;
      m.position.set(
        CHAMBER_CENTER[0] + Math.cos(a) * 0.4 * s.r,
        CHAMBER_CENTER[1] + Math.sin(a * 0.7 + s.phase) * 0.45,
        CHAMBER_CENTER[2] + Math.sin(a) * 0.35 * s.r,
      );
      m.scale.setScalar(0.034);
    }
  });

  return (
    <group>
      {redSeeds.map((_, i) => (
        <mesh
          key={`r${i}`}
          ref={(m) => {
            reds.current[i] = m;
          }}
          geometry={redGeo}
          material={redMat}
        />
      ))}
      {whiteSeeds.map((_, i) => (
        <mesh
          key={`w${i}`}
          ref={(m) => {
            whites.current[i] = m;
          }}
          geometry={redGeo}
          material={whiteMat}
        />
      ))}
    </group>
  );
}

/** The other openings: bright aortic outflow rising through the top trunks,
 *  dimmer inflow sinking back on the right. Same pulse, same data. */
function GreatVessels({ fp }: { fp: FlowParams }) {
  const outflow: [number, number, number][] = [
    [0.02, 0.68, 0.35],
    [0.05, 1.05, 0.2],
    [0.02, 1.5, 0.05],
  ];
  const inflow: [number, number, number][] = [
    [0.3, 1.55, -0.15],
    [0.27, 1.1, -0.1],
    [0.2, 0.7, -0.02],
  ];
  return (
    <group>
      <FlowStream points={outflow} color={fp.red} speed={fp.speed * 0.9} count={10} size={0.02} opacity={0.55} />
      <FlowStream points={inflow} color={fp.redDim} speed={fp.speed * 0.7} count={10} size={0.018} opacity={0.5} />
    </group>
  );
}

/** Sonar shell: whenever the scores actually change (not on every render),
 *  one expanding wireframe shell blooms off the heart and dissolves. */
function PredictionShockwave({ signature }: { signature: string | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef(-10);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (signature !== null) start.current = -1; // armed; clock stamped below
  }, [signature]);

  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    if (start.current === -1) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    if (t < 0 || t > 1.2) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const k = t / 1.2;
    m.scale.setScalar(0.6 + 1.8 * k);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k);
  });

  if (reduce || signature === null) return null;
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 28, 28]} />
      <meshBasicMaterial
        color="#7dd3c8"
        wireframe
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function BloodFlow() {
  const { inputs, prediction } = useStore();
  const fp = flowParams(inputs);
  const reduce = useMemo(() => prefersReducedMotion(), []);
  // Output-driven energy: higher CAD = denser, brighter, more agitated flow.
  // Calm green hearts drift; red hearts surge. Illustrative, not measured.
  const cad = prediction?.cad.probability ?? null;
  const energy = cad === null ? 0.8 : 0.65 + 0.7 * cad;
  const signature = prediction
    ? [
        prediction.cad.probability,
        prediction.vessels.LAD.probability,
        prediction.vessels.LCX.probability,
        prediction.vessels.RCA.probability,
      ]
        .map((p) => p.toFixed(3))
        .join("|")
    : null;

  // Every edit gulps the streams; the surge decays in the frame loop.
  useEffect(() => {
    editPulse.v = 1;
  }, [inputs]);
  useFrame(() => {
    editPulse.v *= 0.93;
  });

  if (reduce) return null;
  return (
    <group>
      {ARTERY_PATHS.map((a) => {
        const prob = prediction?.vessels[a.vessel]?.probability ?? null;
        const speed = fp.speed * (0.85 + 0.3 * energy) * (prob === null ? 1 : 1 - 0.45 * prob);
        return (
          <FlowStream
            key={a.vessel}
            points={a.points}
            color={fp.red}
            speed={speed}
            count={energy > 1 ? 20 : 16}
            size={0.016 * (0.85 + 0.3 * energy)}
            opacity={Math.min(1, 0.8 * energy)}
          />
        );
      })}
      <ChamberSwirl fp={fp} energy={energy} />
      <GreatVessels fp={fp} />
      <PredictionShockwave signature={signature} />
    </group>
  );
}
