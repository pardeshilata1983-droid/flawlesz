import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export type CameraPreset = 'overview' | 'conference' | 'teammate' | 'free';

interface CameraRigProps {
  currentPreset: CameraPreset;
  targetPosition?: [number, number, number] | null;
  targetLookAt?: [number, number, number] | null;
  enableOrbit: boolean;
  onControlsChange?: () => void;
}

const PRESET_CONFIGS = {
  overview: {
    pos: new THREE.Vector3(0, 9.2, 11.5),
    target: new THREE.Vector3(0, 0.8, -0.6)
  },
  conference: {
    pos: new THREE.Vector3(0, 3.4, 4.6),
    target: new THREE.Vector3(0, 0.9, 0)
  }
};

export const CameraRig: React.FC<CameraRigProps> = ({
  currentPreset,
  targetPosition,
  targetLookAt,
  enableOrbit,
  onControlsChange
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Desired animated targets
  const desiredPos = useRef(new THREE.Vector3(0, 9.2, 11.5));
  const desiredTarget = useRef(new THREE.Vector3(0, 0.8, -0.6));
  const isTransitioning = useRef(true);

  // Update desired target when preset or target changes
  useEffect(() => {
    isTransitioning.current = true;
    if (currentPreset === 'overview') {
      desiredPos.current.copy(PRESET_CONFIGS.overview.pos);
      desiredTarget.current.copy(PRESET_CONFIGS.overview.target);
    } else if (currentPreset === 'conference') {
      desiredPos.current.copy(PRESET_CONFIGS.conference.pos);
      desiredTarget.current.copy(PRESET_CONFIGS.conference.target);
    } else if (currentPreset === 'teammate' && targetPosition && targetLookAt) {
      desiredPos.current.set(...targetPosition);
      desiredTarget.current.set(...targetLookAt);
    }
  }, [currentPreset, targetPosition, targetLookAt]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (isTransitioning.current && currentPreset !== 'free') {
      const lerpSpeed = Math.min(delta * 3.5, 0.12);
      camera.position.lerp(desiredPos.current, lerpSpeed);
      controlsRef.current.target.lerp(desiredTarget.current, lerpSpeed);
      controlsRef.current.update();

      // Stop lerping when close enough
      if (
        camera.position.distanceTo(desiredPos.current) < 0.05 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.05
      ) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      enabled={enableOrbit || !isTransitioning.current}
      maxPolarAngle={Math.PI / 2.05} // Do not dip below floor
      minPolarAngle={Math.PI / 6}    // Do not flip over
      minDistance={2.5}
      maxDistance={22}
      onChange={onControlsChange}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
};
