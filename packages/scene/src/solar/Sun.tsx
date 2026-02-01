/**
 * Sun component with fidelity-aware rendering.
 *
 * Standard mode: Textured sphere with basic glow via bloom post-processing.
 * Cinematic mode: Animated surface with procedural noise + corona shell.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh, ShaderMaterial } from 'three';
import { useRenderProfile } from '../render-profile';

// ---------------------------------------------------------------------------
// Shader code for cinematic sun surface
// ---------------------------------------------------------------------------

const CINEMATIC_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vUv = uv;
    // Use world-space normals for consistent lighting
    vNormal = normalize(mat3(modelMatrix) * normal);
    // Pass both world and local positions
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader for animated sun surface.
 * Uses layered simplex noise to create granulation-like patterns.
 * Includes limb darkening for realistic edge falloff.
 */
const CINEMATIC_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform sampler2D uBaseTexture;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  // Simplex noise functions (adapted from Ashima Arts)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Base texture color
    vec4 texColor = texture2D(uBaseTexture, vUv);

    // Animated noise for surface turbulence - use local position for noise sampling
    vec3 noiseCoord = vLocalPosition * 3.0 + vec3(uTime * 0.05, uTime * 0.03, uTime * 0.04);
    float noise1 = snoise(noiseCoord) * 0.5 + 0.5;
    float noise2 = snoise(noiseCoord * 2.0 + 100.0) * 0.5 + 0.5;

    // Combine noise layers
    float turbulence = mix(noise1, noise2, 0.5);

    // Limb darkening: edges appear darker - use world position for view direction
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float limb = dot(vNormal, viewDir);
    float limbDarkening = pow(max(limb, 0.0), 0.4);

    // Base sun colors
    vec3 coreColor = vec3(1.0, 0.95, 0.8);
    vec3 edgeColor = vec3(1.0, 0.6, 0.2);

    // Mix based on turbulence and limb
    vec3 surfaceColor = mix(edgeColor, coreColor, turbulence * limbDarkening);

    // Apply texture influence
    surfaceColor = mix(surfaceColor, texColor.rgb * 1.2, 0.3);

    // Final color with high intensity for bloom
    gl_FragColor = vec4(surfaceColor * limbDarkening * 1.5, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Corona shell shader (additive glow)
// ---------------------------------------------------------------------------

const CORONA_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Use world-space normals for consistent lighting
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CORONA_FRAGMENT_SHADER = `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);

    // Animated corona intensity
    float pulse = sin(uTime * 0.5) * 0.1 + 0.9;

    // Exponential falloff for corona glow
    float corona = pow(rim, 2.5) * pulse;

    // Warm corona color
    vec3 color = mix(vec3(1.0, 0.8, 0.4), vec3(1.0, 0.4, 0.1), rim);

    float alpha = corona * 0.6;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color * 1.5, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Sun component
// ---------------------------------------------------------------------------

interface SunProps {
  /** Sun radius in scene units */
  radius?: number;

  /** Position in scene */
  position?: [number, number, number];

  /** Light intensity for the point light */
  lightIntensity?: number;

  /**
   * Light distance (how far the light reaches).
   * Default is 0 (infinite) to illuminate all planets at multi-AU distances.
   */
  lightDistance?: number;

  /** Enable shadow casting from the point light */
  castShadow?: boolean;

  /** Shadow map resolution (default: 2048) */
  shadowMapSize?: number;
}

/**
 * Sun component with fidelity-aware rendering.
 *
 * In standard mode: Textured sphere with basic emissive material.
 * In cinematic mode: Animated procedural surface + corona shell.
 */
export function Sun({
  radius = 0.25,
  position = [0, 0, 0],
  lightIntensity = 3,
  lightDistance = 0,
  castShadow = false,
  shadowMapSize = 2048,
}: SunProps) {
  const { profile, initialized } = useRenderProfile();
  const meshRef = useRef<Mesh>(null);
  const coronaRef = useRef<Mesh>(null);
  const shaderRef = useRef<ShaderMaterial>(null);
  const coronaShaderRef = useRef<ShaderMaterial>(null);

  // Load base texture (8k resolution for maximum quality)
  const sunTexture = useLoader(THREE.TextureLoader, '/textures/8k_sun.jpg');
  sunTexture.colorSpace = THREE.SRGBColorSpace;

  const isCinematic = initialized && profile.fidelity === 'cinematic';
  // isAnimated is kept for potential future use but rotation is disabled
  const _isAnimated = profile.animation !== 'off';
  void _isAnimated;

  // Shader uniforms for cinematic mode
  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBaseTexture: { value: sunTexture },
    }),
    [sunTexture]
  );

  const coronaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  // Sun rotation is computed from epoch time, not animated
  // This shows the exact orientation at the specified date/time
  useFrame((state) => {
    // Update shader time for surface animation in cinematic mode only
    // but don't rotate the sun itself
    if (isCinematic) {
      if (shaderRef.current?.uniforms?.uTime) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      }
      if (coronaShaderRef.current?.uniforms?.uTime) {
        coronaShaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      }
    }
  });

  const segments = profile.sphereSegments;

  return (
    <group position={position}>
      {/* Main sun sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, segments, segments]} />
        {isCinematic ? (
          <shaderMaterial
            ref={shaderRef}
            vertexShader={CINEMATIC_VERTEX_SHADER}
            fragmentShader={CINEMATIC_FRAGMENT_SHADER}
            uniforms={shaderUniforms}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial map={sunTexture} toneMapped={false} />
        )}
      </mesh>

      {/* Corona shell (cinematic only) */}
      {isCinematic && (
        <mesh ref={coronaRef}>
          <sphereGeometry args={[radius * 1.3, segments / 2, segments / 2]} />
          <shaderMaterial
            ref={coronaShaderRef}
            vertexShader={CORONA_VERTEX_SHADER}
            fragmentShader={CORONA_FRAGMENT_SHADER}
            uniforms={coronaUniforms}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Point light for illuminating planets with shadow support */}
      <pointLight
        intensity={lightIntensity}
        distance={lightDistance}
        decay={2}
        color="#fff8e0"
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
    </group>
  );
}
