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

export function Myocardium({ opacity = 0.45 }: { opacity?: number }) {
  const gltf = useGLTF(HEART_MODEL_URL);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a2f3c",
        transparent: true,
        opacity,
        roughness: 0.55,
        metalness: 0.05,
        depthWrite: false,
      }),
    [opacity],
  );
  const { scene, scale } = useMemo(() => {
    const clone = gltf.scene.clone();
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = material;
      }
    });
    // Auto-fit ANY heart.glb onto the artery rig: measure first, then scale
    // to ~1.9 units tall and center on the rig. Never trust a magic constant
    // (previous file spanned y 0..16.7 and floated out of frame entirely).
    // NOTE: <primitive scale={s}> multiplies the position too, so the offset
    // must be written in unscaled units or the heart drifts off-center.
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const s = size.y > 0 ? 1.9 / size.y : 1;
    clone.position.set(-center.x, -center.y + 0.05 / s, -center.z);
    return { scene: clone, scale: s };
  }, [gltf, material]);
  return <primitive object={scene} scale={scale} />;
}
