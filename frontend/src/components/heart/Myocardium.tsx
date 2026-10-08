"use client";
/** Semi-transparent myocardium from the open-license GLB (see
 *  public/models/CREDITS.md). All meshes share one transparent material so
 *  the coronary tubes stay visible. Missing file -> clear guidance error.
 */
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const HEART_MODEL_URL = "/models/heart.glb";

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
  return <primitive object={scene} scale={1.4} />;
}

useGLTF.preload(HEART_MODEL_URL);
