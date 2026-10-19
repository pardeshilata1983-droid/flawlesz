import React, { useState } from 'react';
import { TeamMember } from '../../pages/TeammatesOfficePage.tsx';
import { BotStatus } from '../BotAvatar.tsx';
import { BotCharacter3D } from './BotCharacter3D.tsx';

export interface WorkstationProps {
  member?: TeamMember | null;
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  status?: BotStatus;
  isSpeaking?: boolean;
  hasError?: boolean;
  isSelected: boolean;
  onClick: () => void;
  accentColor?: string;
  isEmpty?: boolean;
}

export const Workstation3D: React.FC<WorkstationProps> = ({
  member,
  index,
  position,
  rotation,
  status = 'idle',
  isSpeaking = false,
  hasError = false,
  isSelected,
  onClick,
  accentColor = '#E8481C',
  isEmpty = false
}) => {
  const [hovered, setHovered] = useState(false);

  // Screen glow color based on teammate domain or standby state
  const getScreenGlow = () => {
    if (isEmpty) return '#E8481C';
    if (isSpeaking) return '#FF6B3D';
    if (status === 'thinking') return '#F59E0B';
    const roleLower = (member?.role || '').toLowerCase();
    const nameLower = (member?.name || '').toLowerCase();
    if (roleLower.includes('research') || nameLower === 'atlas') return '#3B82F6';
    if (roleLower.includes('write') || nameLower === 'elena') return '#10B981';
    if (roleLower.includes('analyst') || nameLower === 'nova') return '#8B5CF6';
    if (roleLower.includes('plan') || nameLower === 'marcus') return '#EC4899';
    return '#E8481C';
  };

  const getProviderHighlight = () => {
    if (isEmpty || !member) return '#E8481C';
    const prov = (member.provider || '').toLowerCase();
    if (prov === 'gemini') return '#60A5FA';
    if (prov === 'openai') return '#34D399';
    if (prov === 'perplexity') return '#22D3EE';
    if (prov === 'xai') return '#FB923C';
    if (prov === 'openrouter') return '#C084FC';
    return '#FF8A65';
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* ================= MODERN NATURAL OAK DESK ================= */}
      {/* Natural Oak Wood Tabletop with Beveled Edge */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.05, 0.92]} />
        <meshStandardMaterial
          color={hovered || isSelected ? '#DFBE9E' : '#D1B291'}
          roughness={0.45}
          metalness={0.06}
        />
      </mesh>

      {/* Oak Bevel Edge Accent / LED Inset */}
      <mesh position={[0, 0.72, 0.455]}>
        <boxGeometry args={[1.83, 0.015, 0.012]} />
        <meshBasicMaterial
          color={isSelected || isSpeaking ? '#E8481C' : hovered ? '#FFFFFF' : isEmpty ? '#E8481C' : '#997B5E'}
          transparent
          opacity={isEmpty && !hovered && !isSelected ? 0.4 : 1}
        />
      </mesh>

      {/* Modern Charcoal Steel Legs (Architectural A-Frame / Minimalist Square Tube) */}
      <mesh position={[-0.78, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.82]} />
        <meshStandardMaterial color="#22242A" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0.78, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.82]} />
        <meshStandardMaterial color="#22242A" roughness={0.35} metalness={0.8} />
      </mesh>
      {/* Crossbar Stretcher & Cable Spine */}
      <mesh position={[0, 0.28, -0.22]}>
        <boxGeometry args={[1.56, 0.04, 0.04]} />
        <meshStandardMaterial color="#22242A" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* Desk Cable Grommet */}
      <mesh position={[0.55, 0.748, -0.32]}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
        <meshStandardMaterial color="#22242A" metalness={0.8} />
      </mesh>

      {/* Charcoal Felt Desk Mat */}
      <mesh position={[0, 0.748, 0.06]} receiveShadow>
        <boxGeometry args={[0.92, 0.004, 0.46]} />
        <meshStandardMaterial color="#23252A" roughness={0.85} />
      </mesh>

      {/* ================= MONITOR SETUP ================= */}
      {/* Heavy Anodized Aluminum Monitor Stand & Articulated Arm */}
      <mesh position={[0, 0.76, -0.28]}>
        <cylinderGeometry args={[0.11, 0.13, 0.02, 16]} />
        <meshStandardMaterial color="#2A2C32" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.95, -0.28]}>
        <cylinderGeometry args={[0.024, 0.024, 0.38, 16]} />
        <meshStandardMaterial color="#222428" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Main Curved Ultra-wide Screen */}
      <group position={[0, 1.05, -0.22]}>
        <mesh castShadow>
          <boxGeometry args={[1.14, 0.46, 0.03]} />
          <meshStandardMaterial color="#18191D" roughness={0.2} metalness={0.7} />
        </mesh>

        {/* Screen Display Face */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.08, 0.42]} />
          <meshStandardMaterial
            color={isEmpty ? '#0F1116' : '#0D0F14'}
            emissive={getScreenGlow()}
            emissiveIntensity={
              isEmpty
                ? hovered || isSelected
                  ? 0.75
                  : 0.35
                : isSpeaking
                ? 1.4
                : hovered
                ? 1.0
                : 0.65
            }
            roughness={0.25}
          />
        </mesh>

        {/* Empty Workstation Standby UI Accent */}
        {isEmpty && (
          <group position={[0, 0, 0.025]}>
            {/* Plus Icon horizontal bar */}
            <mesh position={[0, 0.02, 0]}>
              <planeGeometry args={[0.16, 0.03]} />
              <meshBasicMaterial color="#E8481C" />
            </mesh>
            {/* Plus Icon vertical bar */}
            <mesh position={[0, 0.02, 0]}>
              <planeGeometry args={[0.03, 0.16]} />
              <meshBasicMaterial color="#E8481C" />
            </mesh>
            {/* Reserved Text line indicator */}
            <mesh position={[0, -0.1, 0]}>
              <planeGeometry args={[0.42, 0.02]} />
              <meshBasicMaterial color="#FAF9F6" />
            </mesh>
          </group>
        )}
      </group>

      {/* Secondary Portrait Analytics Monitor (Only on occupied desks) */}
      {!isEmpty && (
        <group position={[0.72, 1.02, -0.15]} rotation={[0, -0.28, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.54, 0.025]} />
            <meshStandardMaterial color="#18191D" roughness={0.2} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.28, 0.5]} />
            <meshStandardMaterial
              color="#090B0E"
              emissive={getScreenGlow()}
              emissiveIntensity={0.55}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* ================= DESK ACCESSORIES ================= */}
      {/* Low-Profile Mechanical Keyboard */}
      <mesh position={[0, 0.756, 0.14]} rotation={[-0.04, 0, 0]}>
        <boxGeometry args={[0.44, 0.016, 0.15]} />
        <meshStandardMaterial color="#26282E" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Precision Mouse & Pad */}
      <mesh position={[0.32, 0.752, 0.14]}>
        <boxGeometry args={[0.18, 0.004, 0.22]} />
        <meshStandardMaterial color="#1A1C20" roughness={0.8} />
      </mesh>
      <mesh position={[0.32, 0.762, 0.14]}>
        <boxGeometry args={[0.065, 0.022, 0.105]} />
        <meshStandardMaterial color="#2E3037" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Minimalist Warm LED Desk Lamp */}
      <group position={[-0.68, 0.75, -0.2]}>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.065, 0.075, 0.02, 16]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.42, 12]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
        <mesh position={[0.12, 0.42, 0]} rotation={[0, 0, -0.38]}>
          <boxGeometry args={[0.28, 0.02, 0.04]} />
          <meshStandardMaterial color="#24262C" metalness={0.7} />
        </mesh>
        <pointLight position={[0.22, 0.38, 0]} color="#FFF3E0" intensity={isEmpty ? 0.3 : 0.6} distance={1.9} />
      </group>

      {/* Ceramic Coffee Mug / Miniature Desk Planter */}
      <mesh position={[-0.46, 0.795, 0.2]}>
        <cylinderGeometry args={[0.042, 0.038, 0.09, 16]} />
        <meshStandardMaterial color={isEmpty ? '#FAF9F6' : '#E8481C'} roughness={0.25} />
      </mesh>

      {/* ================= ERGONOMIC OFFICE CHAIR ================= */}
      <group position={[0, 0, isEmpty ? 0.62 : 0.72]}>
        {/* Five-Star Castor Base */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.03, 5]} />
          <meshStandardMaterial color="#1E2024" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Chrome Hydraulic Gas-Lift Piston */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.35, 16]} />
          <meshStandardMaterial color="#D1D5DB" metalness={0.92} roughness={0.1} />
        </mesh>
        {/* Curved Contoured Seat Cushion in Charcoal Upholstery */}
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.56, 0.085, 0.54]} />
          <meshStandardMaterial color="#2B2D33" roughness={0.7} />
        </mesh>
        {/* Seating Pad Accent */}
        <mesh position={[0, 0.485, 0]}>
          <cylinderGeometry args={[0.19, 0.21, 0.012, 24]} />
          <meshStandardMaterial
            color={isEmpty ? '#363942' : isSelected || isSpeaking ? '#E8481C' : '#31333B'}
            emissive={isEmpty ? (hovered ? '#E8481C' : '#000000') : isSelected || isSpeaking ? '#E8481C' : getProviderHighlight()}
            emissiveIntensity={isEmpty ? (hovered ? 0.5 : 0) : isSpeaking ? 0.9 : 0.2}
          />
        </mesh>
        {/* Breathable Mesh Backrest with Lumbar Curve */}
        <mesh position={[0, 0.75, 0.25]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.04]} />
          <meshStandardMaterial color="#202227" roughness={0.65} />
        </mesh>
        {/* Soft Polyurethane Armrests */}
        <mesh position={[-0.3, 0.58, 0.05]}>
          <boxGeometry args={[0.065, 0.03, 0.26]} />
          <meshStandardMaterial color="#1E2024" roughness={0.4} />
        </mesh>
        <mesh position={[0.3, 0.58, 0.05]}>
          <boxGeometry args={[0.065, 0.03, 0.26]} />
          <meshStandardMaterial color="#1E2024" roughness={0.4} />
        </mesh>
      </group>

      {/* ================= SEATED 3D BOT CHARACTER (IF OCCUPIED) ================= */}
      {!isEmpty && member && (
        <group position={[0, 0.68, 0.68]}>
          {/* Dedicated Task Spot Light */}
          <pointLight
            position={[0, 0.35, 0.25]}
            color={isSpeaking ? '#FF6B3D' : '#FFFFFF'}
            intensity={isSpeaking ? 1.9 : 1.15}
            distance={2.8}
          />

          {/* Contact Shadow on Chair Seat */}
          <mesh position={[0, -0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 24]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.45} />
          </mesh>

          {/* Holographic Seat Aura Ring */}
          <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.24, 0.28, 32]} />
            <meshBasicMaterial
              color={isSpeaking || isSelected ? '#E8481C' : getProviderHighlight()}
              transparent
              opacity={isSpeaking ? 0.8 : isSelected ? 0.6 : 0.35}
            />
          </mesh>

          {/* Real Seated 3D Bot Character */}
          <BotCharacter3D
            provider={member.provider}
            name={member.name}
            status={hasError ? 'error' : isSpeaking ? 'working' : status}
            isSpeaking={isSpeaking}
            hasError={hasError}
          />
        </group>
      )}

      {/* Floor Spotlight Ring when selected or hovered */}
      {(hovered || isSelected || isSpeaking) && (
        <mesh position={[0, 0.01, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.12, 1.2, 36]} />
          <meshBasicMaterial
            color={isEmpty ? '#E8481C' : isSpeaking || isSelected ? '#E8481C' : '#FFFFFF'}
            transparent
            opacity={isSpeaking ? 0.9 : isSelected ? 0.7 : hovered ? 0.5 : 0.3}
          />
        </mesh>
      )}
    </group>
  );
};
