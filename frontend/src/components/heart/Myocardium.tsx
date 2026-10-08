"use client";
/** Semi-transparent myocardium from the open-license GLB (see
 *  public/models/CREDITS.md). All meshes share one transparent material so
 *  the coronary tubes stay visible.
 *
 *  Mounted ONLY after HeartModelGate confirms the file exists (HEAD check),
 *  so a missing heart.glb shows guidance instead of a suspense-error crash.
 */
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { HEART_MODEL_URL } from "@/lib/arteries";

export function Myocardium() {
  const gltf = useGLTF(HEART_MODEL_URL);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a2f3c",
        transparent: true,
        opacity: 0.45,
        roughness: 0.55,
        metalness: 0.05,
        depthWrite: false,
      }),
    [],
  );
  const scene = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = material;
      }
    });
    return clone;
  }, [gltf, material]);
  return <primitive object={scene} scale={0.08} />;
  // Sketchfab annotated heart spans ~17.7 units tall; 0.08x lands it on the
  // artery paths (~1.4 units). Recheck whenever heart.glb is swapped.
}
