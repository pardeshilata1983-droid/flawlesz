import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OfficeArchitecture3D } from './OfficeArchitecture3D.tsx';
import { Workstation3D } from './Workstation3D.tsx';
import { CameraRig, CameraPreset } from './CameraRig.tsx';
import { TeamMember } from '../../pages/TeammatesOfficePage.tsx';
import { BotStatus } from '../BotAvatar.tsx';

export interface ProjectedSlot {
  x: number;
  y: number;
  visible: boolean;
}

export interface OfficeScene3DProps {
  team: TeamMember[];
  statuses: Record<string, BotStatus>;
  keys: Record<string, string>;
  managedProviders: Record<string, boolean>;
  editingIndex: number | null;
  onSelectEmployee?: (idx: number) => void;
  onSelectEmptyWorkstation?: (slotIdx: number) => void;
  speakingRole?: string | null;
  speakingTextSnippet?: string | null;
  pendingRole?: string | null;
  errorRoles?: Record<string, string>;
  explore3D: boolean;
  activePreset: CameraPreset;
  onPresetChange: (preset: CameraPreset) => void;
  selectedMemberIndex: number | null;
  onSelectMemberIndex: (idx: number | null) => void;
  onProjectSlots?: (slots: ProjectedSlot[]) => void;
  badgeRefs?: React.RefObject<(HTMLDivElement | null)[]>;
}

// 9 Scalable Workstation Coordinates arranged around the office
export const WORKSTATION_CONFIGS = [
  {
    // Slot 0: Front Left Desk A (Occupied by Teammate 0)
    position: [-4.8, 0, 1.8] as [number, number, number],
    rotation: [0, Math.PI * 0.65, 0] as [number, number, number],
    camOffset: [-2.2, 1.8, 3.8] as [number, number, number]
  },
  {
    // Slot 1: Rear Left Desk B (Occupied by Teammate 1)
    position: [-4.8, 0, -2.4] as [number, number, number],
    rotation: [0, Math.PI * 0.35, 0] as [number, number, number],
    camOffset: [-2.2, 1.8, -0.6] as [number, number, number]
  },
  {
    // Slot 2: Front Right Desk C (Occupied by Teammate 2)
    position: [4.8, 0, 1.8] as [number, number, number],
    rotation: [0, -Math.PI * 0.65, 0] as [number, number, number],
    camOffset: [2.2, 1.8, 3.8] as [number, number, number]
  },
  {
    // Slot 3: Rear Right Desk D (Occupied by Teammate 3)
    position: [4.8, 0, -2.4] as [number, number, number],
    rotation: [0, -Math.PI * 0.35, 0] as [number, number, number],
    camOffset: [2.2, 1.8, -0.6] as [number, number, number]
  },
  {
    // Slot 4: Back Center Executive Bay E (Occupied by Teammate 4)
    position: [0, 0, -4.6] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
    camOffset: [0, 1.9, -2.1] as [number, number, number]
  },
  {
    // Slot 5: Left Outer Pod F (Furnished Empty / Expansion)
    position: [-7.8, 0, -0.4] as [number, number, number],
    rotation: [0, Math.PI * 0.5, 0] as [number, number, number],
    camOffset: [-5.2, 1.8, 0.4] as [number, number, number]
  },
  {
    // Slot 6: Right Outer Pod G (Furnished Empty / Expansion)
    position: [7.8, 0, -0.4] as [number, number, number],
    rotation: [0, -Math.PI * 0.5, 0] as [number, number, number],
    camOffset: [5.2, 1.8, 0.4] as [number, number, number]
  },
  {
    // Slot 7: Window Left Executive Bay H (Furnished Empty / Expansion)
    position: [-2.6, 0, -4.6] as [number, number, number],
    rotation: [0, Math.PI * 0.95, 0] as [number, number, number],
    camOffset: [-1.2, 1.8, -2.4] as [number, number, number]
  },
  {
    // Slot 8: Window Right Executive Bay I (Furnished Empty / Expansion)
    position: [2.6, 0, -4.6] as [number, number, number],
    rotation: [0, Math.PI * 1.05, 0] as [number, number, number],
    camOffset: [1.2, 1.8, -2.4] as [number, number, number]
  }
];

// Screen Projector computes 2D coordinates for the overlay HUD
const tempVec = new THREE.Vector3();
const tempUp = new THREE.Vector3(0, 1, 0);

const ScreenProjector: React.FC<{
  onProject?: (slots: ProjectedSlot[]) => void;
  badgeRefs?: React.RefObject<(HTMLDivElement | null)[]>;
}> = ({ badgeRefs }) => {
  const { camera } = useThree();

  useFrame(() => {
    const elements = badgeRefs?.current;
    if (elements && elements.length > 0) {
      for (let i = 0; i < WORKSTATION_CONFIGS.length; i++) {
        const el = elements[i];
        if (!el) continue;

        const cfg = WORKSTATION_CONFIGS[i];
        tempVec.set(0, 1.5, 0.68);
        tempVec.applyAxisAngle(tempUp, cfg.rotation[1]);
        tempVec.add(new THREE.Vector3(cfg.position[0], cfg.position[1], cfg.position[2]));
        tempVec.project(camera);

        const inFront = tempVec.z < 1 && tempVec.z > -1;
        const xPct = ((tempVec.x + 1) / 2) * 100;
        const yPct = ((-tempVec.y + 1) / 2) * 100;

        if (inFront && xPct >= 1 && xPct <= 99 && yPct >= 1 && yPct <= 99) {
          el.style.left = `${xPct}%`;
          el.style.top = `${yPct}%`;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      }
    }
  });

  return null;
};

export const OfficeScene3D: React.FC<OfficeScene3DProps> = ({
  team,
  statuses,
  keys,
  managedProviders,
  editingIndex,
  onSelectEmployee,
  onSelectEmptyWorkstation,
  speakingRole,
  speakingTextSnippet,
  pendingRole,
  errorRoles,
  explore3D,
  activePreset,
  onPresetChange,
  selectedMemberIndex,
  onSelectMemberIndex,
  onProjectSlots,
  badgeRefs
}) => {
  const [targetCamPos, setTargetCamPos] = useState<[number, number, number] | null>(null);
  const [targetLookAt, setTargetLookAt] = useState<[number, number, number] | null>(null);

  // If a teammate is selected, smoothly focus on their desk if in teammate view
  useEffect(() => {
    if (activePreset === 'teammate' && selectedMemberIndex !== null) {
      const config = WORKSTATION_CONFIGS[selectedMemberIndex] || WORKSTATION_CONFIGS[0];
      setTargetCamPos([config.camOffset[0], config.camOffset[1], config.camOffset[2]]);
      setTargetLookAt([config.position[0], 1.1, config.position[2]]);
    }
  }, [activePreset, selectedMemberIndex]);

  // When a teammate speaks during meeting, if user is in teammate preset, focus
  useEffect(() => {
    if (speakingRole) {
      const idx = team.findIndex((m) => m.role === speakingRole);
      if (idx !== -1 && activePreset === 'teammate') {
        const config = WORKSTATION_CONFIGS[idx] || WORKSTATION_CONFIGS[0];
        setTargetCamPos([config.camOffset[0], config.camOffset[1], config.camOffset[2]]);
        setTargetLookAt([config.position[0], 1.1, config.position[2]]);
        onSelectMemberIndex(idx);
      }
    }
  }, [speakingRole, team, activePreset, onSelectMemberIndex]);

  const handleSelectWorkstation = (idx: number, isEmpty: boolean) => {
    onSelectMemberIndex(idx);
    onPresetChange('teammate');
    const config = WORKSTATION_CONFIGS[idx] || WORKSTATION_CONFIGS[0];
    setTargetCamPos([config.camOffset[0], config.camOffset[1], config.camOffset[2]]);
    setTargetLookAt([config.position[0], 1.1, config.position[2]]);

    if (isEmpty) {
      if (onSelectEmptyWorkstation) {
        onSelectEmptyWorkstation(idx);
      }
    } else {
      if (onSelectEmployee) {
        onSelectEmployee(idx);
      }
    }
  };

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: [0, 9.4, 11.8], fov: 45, near: 0.1, far: 80 }}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        className="w-full h-full bg-[#E5E9EE]"
      >
        {/* ================= ARCHITECTURAL DAYLIGHT & WARM ILLUMINATION ================= */}
        {/* Warm ambient daylight */}
        <ambientLight color="#FFFDF7" intensity={0.9} />
        {/* Hemisphere light: Sky blue above, warm floor bounce below */}
        <hemisphereLight
          color="#D4E6FA"
          groundColor="#EAE5DC"
          intensity={0.65}
        />

        {/* Primary Sun & Window Key Light with Soft Contact Shadows */}
        <directionalLight
          position={[6, 13, 7]}
          intensity={1.75}
          color="#FFFBF2"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={36}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0001}
        />

        {/* Soft Secondary Daylight Fill pouring through panoramic windows */}
        <directionalLight
          position={[-7, 8, -6]}
          intensity={0.85}
          color="#D0E3F8"
        />

        {/* Center conference table warm accent light */}
        <pointLight position={[0, 3.8, 0]} color="#FFFAF0" intensity={0.9} distance={9} />

        {/* ================= CAMERA CONTROLS RIG ================= */}
        <CameraRig
          currentPreset={explore3D ? 'free' : activePreset}
          targetPosition={targetCamPos}
          targetLookAt={targetLookAt}
          enableOrbit={explore3D || activePreset === 'free'}
        />

        {/* ================= 2D SCREEN PROJECTION TRACKER ================= */}
        <ScreenProjector onProject={onProjectSlots} badgeRefs={badgeRefs} />

        {/* ================= ARCHITECTURE & ENVIRONMENT ================= */}
        <OfficeArchitecture3D />

        {/* ================= WORKSTATIONS (OCCUPIED + AT LEAST 4 EMPTY EXPANSIONS) ================= */}
        {WORKSTATION_CONFIGS.map((config, idx) => {
          const isOccupied = idx < team.length;
          const member = isOccupied ? team[idx] : null;

          if (isOccupied && member) {
            const isSpeaking = speakingRole === member.role;
            const isPending = pendingRole === member.role;
            const hasError = Boolean(errorRoles?.[member.role]);
            const status = hasError
              ? 'error'
              : isSpeaking
              ? 'working'
              : isPending
              ? 'thinking'
              : (statuses[member.role] || 'idle');
            const isSelected = selectedMemberIndex === idx || editingIndex === idx;

            return (
              <Workstation3D
                key={`workstation-${member.id || idx}`}
                member={member}
                index={idx}
                position={config.position}
                rotation={config.rotation}
                status={status}
                isSpeaking={isSpeaking}
                hasError={hasError}
                isSelected={isSelected}
                onClick={() => handleSelectWorkstation(idx, false)}
                isEmpty={false}
              />
            );
          } else {
            // Furnished Empty Workstation for Future Expansion
            const isSelected = selectedMemberIndex === idx;

            return (
              <Workstation3D
                key={`empty-workstation-${idx}`}
                index={idx}
                position={config.position}
                rotation={config.rotation}
                isSelected={isSelected}
                onClick={() => handleSelectWorkstation(idx, true)}
                isEmpty={true}
              />
            );
          }
        })}
      </Canvas>
    </div>
  );
};
