import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BotStatus } from '../BotAvatar.tsx';

export interface TeammateOrbProps {
  status: BotStatus;
  isSpeaking: boolean;
  color?: string;
  name: string;
}

export const TeammateOrb3D: React.FC<TeammateOrbProps> = ({
  status,
  isSpeaking,
  color = '#E8481C',
  name
}) => {
  const orbRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!orbRef.current) return;
    const t = state.clock.getElapsedTime();
    // Smooth hover bobbing
    const speed = status === 'working' || isSpeaking ? 3.5 : status === 'thinking' ? 2.5 : 1.5;
    const amplitude = status === 'working' || isSpeaking ? 0.08 : 0.04;
    orbRef.current.position.y = Math.sin(t * speed) * amplitude;

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * (isSpeaking ? 2.0 : 0.8);
      ring1Ref.current.rotation.y += delta * (isSpeaking ? 1.5 : 0.5);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y -= delta * (isSpeaking ? 1.8 : 0.6);
      ring2Ref.current.rotation.z += delta * (isSpeaking ? 1.2 : 0.4);
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * (isSpeaking ? 8 : 2)) * (isSpeaking ? 0.12 : 0.04);
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const getCoreColor = () => {
    if (status === 'error') return '#EF4444';
    if (isSpeaking || status === 'working') return '#E8481C';
    if (status === 'thinking') return '#F59E0B';
    if (status === 'done') return '#10B981';
    return '#111111';
  };

  const getGlowColor = () => {
    if (status === 'error') return '#F87171';
    if (isSpeaking || status === 'working') return '#FF6B3D';
    if (status === 'thinking') return '#FCD34D';
    if (status === 'done') return '#34D399';
    return '#E8481C';
  };

  return (
    <group ref={orbRef}>
      {/* Outer translucent energy sphere */}
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshPhysicalMaterial
          color={getGlowColor()}
          transparent
          opacity={isSpeaking ? 0.45 : 0.25}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>

      {/* Glowing inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={getCoreColor()}
          emissive={getGlowColor()}
          emissiveIntensity={isSpeaking ? 2.0 : status === 'thinking' ? 1.2 : 0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Orbital Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.38, 0.015, 16, 48]} />
        <meshStandardMaterial
          color={getGlowColor()}
          emissive={getGlowColor()}
          emissiveIntensity={isSpeaking ? 1.8 : 0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Orbital Ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.42, 0.012, 16, 48]} />
        <meshStandardMaterial
          color={getGlowColor()}
          emissive={getGlowColor()}
          emissiveIntensity={isSpeaking ? 1.5 : 0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Speaking soundwave ring when speaking */}
      {isSpeaking && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
          <ringGeometry args={[0.45, 0.48, 32]} />
          <meshBasicMaterial color="#FF6B3D" side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      )}

      {/* Local point light casting dynamic light onto desk */}
      <pointLight
        color={getGlowColor()}
        intensity={isSpeaking ? 2.5 : status === 'thinking' ? 1.6 : 0.8}
        distance={3.5}
        decay={2}
      />
    </group>
  );
};
