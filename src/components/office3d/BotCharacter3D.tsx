import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BotStatus } from '../BotAvatar.tsx';

interface BotCharacter3DProps {
  provider: string;
  name: string;
  status: BotStatus;
  isSpeaking: boolean;
  hasError: boolean;
}

// Provider body colors matching the original 2D Kirby-style bots
const PROVIDER_BODY_COLORS: Record<string, string> = {
  gemini: '#B8DCFE',     // Soft electric blue
  openai: '#A7F3D0',     // Fresh AI mint
  perplexity: '#A5F3FC', // Deep search teal
  xai: '#FED7AA',        // Grok sunset orange
  openrouter: '#E9D5FF', // Purple multi-model
  default: '#FFC2E9'     // Classic Kirby Pink
};

export const BotCharacter3D: React.FC<BotCharacter3DProps> = ({
  provider,
  name,
  status,
  isSpeaking,
  hasError
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftHandRef = useRef<THREE.Mesh>(null);
  const rightHandRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Group>(null);
  const eyeRightRef = useRef<THREE.Group>(null);

  const provKey = (provider || 'default').toLowerCase();
  const bodyColor = PROVIDER_BODY_COLORS[provKey] || PROVIDER_BODY_COLORS.default;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // 1. Natural Breathing & Posture
    const isBusy = isSpeaking || status === 'working';
    const isThinking = status === 'thinking';

    const bobSpeed = isBusy ? 4.2 : isThinking ? 2.8 : 1.6;
    const bobAmp = isBusy ? 0.025 : 0.012;
    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;

    // Head tilt towards desk / monitor
    if (bodyRef.current) {
      if (isBusy) {
        // Active focus: slight nod toward screen and keyboard
        bodyRef.current.rotation.x = -0.08 + Math.sin(t * 5) * 0.02;
        bodyRef.current.rotation.y = Math.sin(t * 1.5) * 0.06;
      } else if (isThinking) {
        // Calculating: contemplative side tilt
        bodyRef.current.rotation.x = -0.04;
        bodyRef.current.rotation.z = Math.sin(t * 1.2) * 0.05;
      } else {
        // Calm idle posture facing monitor
        bodyRef.current.rotation.x = -0.05 + Math.sin(t * 0.8) * 0.015;
        bodyRef.current.rotation.y = Math.sin(t * 0.6) * 0.03;
        bodyRef.current.rotation.z = 0;
      }
    }

    // 2. Typing / Gesturing Hands at keyboard
    if (leftHandRef.current && rightHandRef.current) {
      if (isBusy) {
        // Fast, exaggerated keyboard typing cadence with occasional wave/gesture
        leftHandRef.current.position.z = 0.22 + Math.sin(t * 15) * 0.05;
        leftHandRef.current.position.y = -0.02 + Math.cos(t * 15) * 0.03;
        leftHandRef.current.rotation.z = Math.sin(t * 5) * 0.2;

        rightHandRef.current.position.z = 0.22 + Math.cos(t * 15 + 1) * 0.05;
        rightHandRef.current.position.y = -0.02 + Math.sin(t * 15 + 1) * 0.03;
        rightHandRef.current.rotation.z = Math.cos(t * 5) * 0.2;
      } else if (isThinking) {
        // Hand brought towards chin / contemplation with head-bobbing
        leftHandRef.current.position.z = 0.22;
        leftHandRef.current.position.y = -0.02 + Math.sin(t * 2) * 0.02;
        leftHandRef.current.rotation.z = 0.1;
        
        rightHandRef.current.position.z = 0.24;
        rightHandRef.current.position.y = -0.01 + Math.sin(t * 2 + 1) * 0.02;
        rightHandRef.current.rotation.z = -0.1;
      } else {
        // Subtle idle animations: tapping fingers
        leftHandRef.current.position.z = 0.18 + Math.sin(t * 3) * 0.01;
        leftHandRef.current.position.y = -0.04;
        
        rightHandRef.current.position.z = 0.18 + Math.cos(t * 3) * 0.01;
        rightHandRef.current.position.y = -0.04;
      }
    }

    // 3. Natural Periodic Eye Blink
    const blinkCycle = (t % 4.5);
    const isBlinking = blinkCycle > 4.35;
    const eyeScaleY = isBlinking ? 0.1 : 1;

    if (eyeLeftRef.current && eyeRightRef.current) {
      eyeLeftRef.current.scale.y = eyeScaleY;
      eyeRightRef.current.scale.y = eyeScaleY;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ================= ROUND BOT BODY ================= */}
      <mesh ref={bodyRef} castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.35}
          metalness={0.1}
          emissive={isSpeaking ? '#E8481C' : status === 'thinking' ? '#F59E0B' : hasError ? '#EF4444' : '#000000'}
          emissiveIntensity={isSpeaking ? 0.45 : status === 'thinking' ? 0.3 : hasError ? 0.5 : 0}
        />
      </mesh>

      {/* ================= EYES ================= */}
      {/* Left Eye */}
      <group ref={eyeLeftRef} position={[-0.065, 0.03, 0.2]}>
        <mesh>
          <capsuleGeometry args={[0.022, 0.035, 8, 16]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0.006, 0.015, 0.015]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* Right Eye */}
      <group ref={eyeRightRef} position={[0.065, 0.03, 0.2]}>
        <mesh>
          <capsuleGeometry args={[0.022, 0.035, 8, 16]} />
          <meshBasicMaterial color="#1E293B" />
        </mesh>
        <mesh position={[0.006, 0.015, 0.015]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* ================= BLUSH CHEEKS ================= */}
      <mesh position={[-0.12, -0.025, 0.17]}>
        <circleGeometry args={[0.028, 16]} />
        <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
      </mesh>
      <mesh position={[0.12, -0.025, 0.17]}>
        <circleGeometry args={[0.028, 16]} />
        <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
      </mesh>

      {/* ================= LITTLE HANDS RESTING ON DESK/ARMRESTS ================= */}
      <mesh ref={leftHandRef} position={[-0.2, -0.04, 0.18]} castShadow>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} />
      </mesh>
      <mesh ref={rightHandRef} position={[0.2, -0.04, 0.18]} castShadow>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} />
      </mesh>

      {/* ================= LITTLE FEET SEATED FORWARD ================= */}
      <mesh position={[-0.1, -0.18, 0.12]} rotation={[0.2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.08, 8, 16]} />
        <meshStandardMaterial color="#E11D48" roughness={0.4} />
      </mesh>
      <mesh position={[0.1, -0.18, 0.12]} rotation={[0.2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.08, 8, 16]} />
        <meshStandardMaterial color="#E11D48" roughness={0.4} />
      </mesh>
    </group>
  );
};
