import React from 'react';
import * as THREE from 'three';

export const OfficeArchitecture3D: React.FC = () => {
  return (
    <group>
      {/* ================= ARCHITECTURAL FLOOR ================= */}
      {/* Light Terrazzo / Warm Architectural Grey Concrete Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 24]} />
        <meshStandardMaterial
          color="#E6E3DC"
          roughness={0.42}
          metalness={0.06}
        />
      </mesh>

      {/* Subtle Architectural Grid Seams */}
      <gridHelper
        args={[26, 26, '#D0CCC3', '#DDD9CF']}
        position={[0, 0.002, 0]}
      />

      {/* Central Collaboration Zone Inlay Rug (Warm Charcoal with subtle Orange Brand Rim) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0, 3.4, 48]} />
        <meshStandardMaterial color="#24262B" roughness={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[3.32, 3.4, 64]} />
        <meshBasicMaterial color="#E8481C" transparent opacity={0.65} />
      </mesh>

      {/* ================= BACK WALL WITH WARM WOOD SLATS & LARGE WINDOWS ================= */}
      {/* Upper Back Wall - Warm Off-White Architectural Surface */}
      <mesh position={[0, 4.2, -7.5]} receiveShadow>
        <boxGeometry args={[26, 2.4, 0.3]} />
        <meshStandardMaterial color="#F4F2EC" roughness={0.88} />
      </mesh>

      {/* Lower Back Wall Wainscoting - Warm Off-White with Oak trim */}
      <mesh position={[0, 0.4, -7.5]} receiveShadow>
        <boxGeometry args={[26, 0.8, 0.3]} />
        <meshStandardMaterial color="#EAE7DF" roughness={0.82} />
      </mesh>
      {/* Oak Baseboard Trim */}
      <mesh position={[0, 0.06, -7.34]} receiveShadow>
        <boxGeometry args={[26, 0.12, 0.04]} />
        <meshStandardMaterial color="#B59473" roughness={0.6} />
      </mesh>

      {/* Left Wall - Warm Off-White with Acoustic Oak Slats */}
      <group position={[-11.5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[18, 5.0, 0.3]} />
          <meshStandardMaterial color="#F5F3ED" roughness={0.9} />
        </mesh>
        {/* Decorative Natural Oak Wall Slats */}
        {[-4.8, -4.2, -3.6, -3.0, -2.4, 2.4, 3.0, 3.6, 4.2, 4.8].map((x, i) => (
          <mesh key={`l-slat-${i}`} position={[x, 0, 0.16]}>
            <boxGeometry args={[0.18, 4.2, 0.04]} />
            <meshStandardMaterial color="#C7A785" roughness={0.55} />
          </mesh>
        ))}
      </group>

      {/* Right Wall - Warm Off-White with Acoustic Oak Slats */}
      <group position={[11.5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[18, 5.0, 0.3]} />
          <meshStandardMaterial color="#F5F3ED" roughness={0.9} />
        </mesh>
        {[-4.8, -4.2, -3.6, -3.0, -2.4, 2.4, 3.0, 3.6, 4.2, 4.8].map((x, i) => (
          <mesh key={`r-slat-${i}`} position={[x, 0, 0.16]}>
            <boxGeometry args={[0.18, 4.2, 0.04]} />
            <meshStandardMaterial color="#C7A785" roughness={0.55} />
          </mesh>
        ))}
      </group>

      {/* ================= LARGE PANORAMIC DAYLIGHT WINDOWS ================= */}
      {/* Window Frame Mullions (Matte Charcoal Anodized Aluminum) */}
      {[-8.0, -4.8, -1.6, 1.6, 4.8, 8.0].map((x, i) => (
        <group key={`mullion-${i}`} position={[x, 2.1, -7.4]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 3.4, 0.16]} />
            <meshStandardMaterial color="#28292E" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Horizontal Transom Bars */}
      <mesh position={[0, 1.8, -7.4]}>
        <boxGeometry args={[20, 0.07, 0.12]} />
        <meshStandardMaterial color="#28292E" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.6, -7.4]}>
        <boxGeometry args={[20, 0.07, 0.12]} />
        <meshStandardMaterial color="#28292E" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Clear Glass Panes with Soft Daylight Reflections */}
      <mesh position={[0, 2.2, -7.42]}>
        <planeGeometry args={[20, 3.2]} />
        <meshPhysicalMaterial
          color="#A8C8E8"
          transmission={0.88}
          opacity={0.3}
          transparent
          roughness={0.08}
          metalness={0.15}
          reflectivity={0.85}
        />
      </mesh>

      {/* ================= DAYLIGHT SKY & EXPANSIVE CITY PANORAMA ================= */}
      <group position={[0, 0, -13]}>
        {/* Soft daylight sky gradient backdrop */}
        <mesh position={[0, 7, 0]}>
          <planeGeometry args={[48, 20]} />
          <meshBasicMaterial color="#E8F1FA" />
        </mesh>
        {/* Horizon warm atmospheric haze */}
        <mesh position={[0, 2.2, 0.1]}>
          <planeGeometry args={[48, 6]} />
          <meshBasicMaterial color="#FDF6ED" transparent opacity={0.75} />
        </mesh>

        {/* Contemporary Glass & Steel City Skyline Silhouettes in Daylight */}
        {[
          { x: -10, h: 7.2, w: 2.4, color: '#C2D1E0' },
          { x: -7, h: 10.5, w: 2.8, color: '#B0C2D4' },
          { x: -3.8, h: 8.2, w: 2.2, color: '#BED0E2' },
          { x: -1.0, h: 12.0, w: 3.4, color: '#A5BAD0' },
          { x: 2.8, h: 9.0, w: 2.6, color: '#B6C8DC' },
          { x: 6.2, h: 11.2, w: 3.0, color: '#A8BED4' },
          { x: 9.5, h: 8.0, w: 2.4, color: '#C0D0E0' },
        ].map((b, i) => (
          <group key={`tower-${i}`} position={[b.x, b.h / 2, 0.2]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, 1]} />
              <meshStandardMaterial color={b.color} roughness={0.85} />
            </mesh>
            {/* Architectural beacon on skyline tower */}
            <mesh position={[0, b.h / 2 + 0.15, 0]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#E8481C" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================= GLASS PARTITION DIVIDERS ================= */}
      {/* Frosted Architectural Glass Screens between Workstation Bays */}
      <group position={[-5.8, 1.15, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.04, 1.5, 4.4]} />
          <meshPhysicalMaterial
            color="#EAF0F6"
            transmission={0.85}
            opacity={0.4}
            transparent
            roughness={0.3}
            metalness={0.05}
          />
        </mesh>
        {/* Slim Charcoal Frame */}
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[0.06, 0.04, 4.44]} />
          <meshStandardMaterial color="#2B2D33" metalness={0.8} />
        </mesh>
      </group>

      <group position={[5.8, 1.15, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.04, 1.5, 4.4]} />
          <meshPhysicalMaterial
            color="#EAF0F6"
            transmission={0.85}
            opacity={0.4}
            transparent
            roughness={0.3}
            metalness={0.05}
          />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[0.06, 0.04, 4.44]} />
          <meshStandardMaterial color="#2B2D33" metalness={0.8} />
        </mesh>
      </group>

      {/* ================= WALL CREDENZA & ARCHITECTURAL BOOKSHELVES ================= */}
      {/* Left Wall Modern Low Credenza with Books & Decor */}
      <group position={[-11.2, 0.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Oak Cabinet Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.75, 0.48]} />
          <meshStandardMaterial color="#C8A882" roughness={0.5} />
        </mesh>
        {/* Metal Sled Legs */}
        <mesh position={[-1.4, -0.42, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.44]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
        <mesh position={[1.4, -0.42, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.44]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
        {/* Books on Credenza Top */}
        <mesh position={[-0.8, 0.44, 0]} castShadow>
          <boxGeometry args={[0.26, 0.14, 0.3]} />
          <meshStandardMaterial color="#1E2024" roughness={0.6} />
        </mesh>
        <mesh position={[-0.8, 0.52, 0]} castShadow>
          <boxGeometry args={[0.22, 0.06, 0.28]} />
          <meshStandardMaterial color="#E8481C" roughness={0.4} />
        </mesh>
        {/* Minimalist Ceramic Vase with branch */}
        <mesh position={[0.7, 0.52, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.28, 16]} />
          <meshStandardMaterial color="#FAF9F6" roughness={0.3} />
        </mesh>
      </group>

      {/* Right Wall Credenza & Wall Art */}
      <group position={[11.2, 0.45, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.75, 0.48]} />
          <meshStandardMaterial color="#C8A882" roughness={0.5} />
        </mesh>
        <mesh position={[-1.4, -0.42, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.44]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
        <mesh position={[1.4, -0.42, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.44]} />
          <meshStandardMaterial color="#1E2024" metalness={0.8} />
        </mesh>
      </group>

      {/* Minimalist Tech Art Frame on Left Wall */}
      <group position={[-11.32, 2.7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.8, 1.6, 0.04]} />
          <meshStandardMaterial color="#202227" roughness={0.4} />
        </mesh>
        {/* Clean Modern Canvas Artwork */}
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[2.65, 1.45]} />
          <meshStandardMaterial color="#FAF8F5" roughness={0.8} />
        </mesh>
        {/* Subtle Orange Geometric Art Accent */}
        <mesh position={[-0.4, 0.1, 0.03]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial color="#E8481C" />
        </mesh>
        <mesh position={[0.5, -0.15, 0.03]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshBasicMaterial color="#1E2024" />
        </mesh>
      </group>

      {/* FLAWLESZ AI Dimensional Metal Lettering on Back Wall */}
      <group position={[0, 3.9, -7.32]}>
        {/* Charcoal Sign Plaque */}
        <mesh castShadow>
          <boxGeometry args={[5.2, 0.8, 0.04]} />
          <meshStandardMaterial color="#1C1E23" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Subtle Orange Glow Underline */}
        <mesh position={[0, -0.32, 0.025]}>
          <planeGeometry args={[4.8, 0.04]} />
          <meshBasicMaterial color="#E8481C" />
        </mesh>
        {/* FLAWLESZ Brand Indicator */}
        <mesh position={[0, 0.08, 0.025]}>
          <planeGeometry args={[3.8, 0.28]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* ================= CENTRAL COLLABORATION ROUNDTABLE ================= */}
      {/* Warm Natural Blond Oak / Light Travertine Conference Table */}
      <group position={[0, 0, 0]}>
        {/* Tabletop - Natural Blond Oak finish */}
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 1.65, 0.06, 48]} />
          <meshStandardMaterial
            color="#D2B596"
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>

        {/* Outer Inset Warm Accent Rim */}
        <mesh position={[0, 0.771, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.56, 1.6, 48]} />
          <meshBasicMaterial color="#E8481C" transparent opacity={0.65} />
        </mesh>

        {/* Central Conference Hub / Microphones Emitter */}
        <mesh position={[0, 0.772, 0]}>
          <cylinderGeometry args={[0.38, 0.4, 0.02, 32]} />
          <meshStandardMaterial color="#22242A" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.783, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.35, 32]} />
          <meshBasicMaterial color="#E8481C" transparent opacity={0.85} />
        </mesh>

        {/* Sculptural Fluted Charcoal Metal Pedestal Base */}
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.72, 0.74, 32]} />
          <meshStandardMaterial color="#1E2026" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* 4 Comfortable Charcoal Upholstered Conference Armchairs */}
        {[
          { angle: 0, x: 2.15, z: 0, rotY: -Math.PI / 2 },
          { angle: Math.PI / 2, x: 0, z: 2.15, rotY: Math.PI },
          { angle: Math.PI, x: -2.15, z: 0, rotY: Math.PI / 2 },
          { angle: -Math.PI / 2, x: 0, z: -2.15, rotY: 0 },
        ].map((c, i) => (
          <group key={`conf-chair-${i}`} position={[c.x, 0, c.z]} rotation={[0, c.rotY, 0]}>
            {/* Castor Base */}
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.02, 16]} />
              <meshStandardMaterial color="#1E2024" metalness={0.8} />
            </mesh>
            {/* Chrome Piston */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.36, 12]} />
              <meshStandardMaterial color="#D1D5DB" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Curved Padded Seat Cushion - Charcoal Fabric */}
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.48, 0.08, 0.46]} />
              <meshStandardMaterial color="#2D3037" roughness={0.7} />
            </mesh>
            {/* Ergonomic Curved Backrest */}
            <mesh position={[0, 0.74, 0.19]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.46, 0.54, 0.04]} />
              <meshStandardMaterial color="#24262C" roughness={0.65} />
            </mesh>
            {/* Armrests */}
            <mesh position={[-0.26, 0.58, 0.05]}>
              <boxGeometry args={[0.04, 0.025, 0.26]} />
              <meshStandardMaterial color="#1E2024" metalness={0.8} />
            </mesh>
            <mesh position={[0.26, 0.58, 0.05]}>
              <boxGeometry args={[0.04, 0.025, 0.26]} />
              <meshStandardMaterial color="#1E2024" metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================= ARCHITECTURAL CEILING FIXTURES ================= */}
      {/* Linear Recessed Lighting Bars with Warm 4000K Illumination */}
      {[-5, 0, 5].map((x, i) => (
        <group key={`ceiling-light-${i}`} position={[x, 4.8, 0]}>
          <mesh>
            <boxGeometry args={[0.18, 0.08, 14]} />
            <meshStandardMaterial color="#2B2D33" />
          </mesh>
          {/* Warm LED Diffuser */}
          <mesh position={[0, -0.041, 0]}>
            <planeGeometry args={[0.14, 13.8]} />
            <meshBasicMaterial color="#FFF7ED" />
          </mesh>
        </group>
      ))}

      {/* ================= MODERN INDOOR PLANTERS ================= */}
      {/* Planter 1: Window Left with Fiddle-Leaf Fig Foliage */}
      <group position={[-9.2, 0, -6.0]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.32, 0.96, 24]} />
          <meshStandardMaterial color="#FAF8F5" roughness={0.35} />
        </mesh>
        {/* Layered Lush Organic Leaves */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#235332" roughness={0.7} />
        </mesh>
        <mesh position={[0.18, 1.6, 0.12]} castShadow>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color="#2D683E" roughness={0.7} />
        </mesh>
      </group>

      {/* Planter 2: Window Right with Fiddle-Leaf Fig Foliage */}
      <group position={[9.2, 0, -6.0]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.32, 0.96, 24]} />
          <meshStandardMaterial color="#FAF8F5" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.25, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#235332" roughness={0.7} />
        </mesh>
        <mesh position={[-0.18, 1.6, 0.12]} castShadow>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color="#2D683E" roughness={0.7} />
        </mesh>
      </group>

      {/* Planter 3: Near Left Partition */}
      <group position={[-6.2, 0, 3.4]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.22, 0.7, 20]} />
          <meshStandardMaterial color="#1E2024" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.36, 16, 16]} />
          <meshStandardMaterial color="#2D683E" roughness={0.7} />
        </mesh>
      </group>

      {/* Planter 4: Near Right Partition */}
      <group position={[6.2, 0, 3.4]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.22, 0.7, 20]} />
          <meshStandardMaterial color="#1E2024" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow>
          <sphereGeometry args={[0.36, 16, 16]} />
          <meshStandardMaterial color="#2D683E" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
