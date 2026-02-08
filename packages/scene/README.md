# @worldline-kinematics/scene

React Three Fiber components for solar system and worldline visualization.

## Installation

```bash
pnpm add @worldline-kinematics/scene
```

Peer dependencies:

```bash
pnpm add react react-dom
```

## Usage

```tsx
import { Canvas } from '@react-three/fiber';
import {
  Sun,
  Planet,
  Earth,
  CameraRig,
  RenderProfileProvider,
} from '@worldline-kinematics/scene';

function SolarSystem() {
  return (
    <Canvas>
      <RenderProfileProvider>
        <Sun position={[0, 0, 0]} radiusScene={0.1} />
        <Planet
          bodyId="Earth"
          position={{ x: 1, y: 0, z: 0 }}
          radiusScene={0.01}
          epoch={new Date()}
        />
        <CameraRig
          target={{
            bodyId: 'Earth',
            position: { x: 1, y: 0, z: 0 },
            radiusScene: 0.01,
          }}
        />
      </RenderProfileProvider>
    </Canvas>
  );
}
```

## Exports

### Render Profile

- `RenderProfileProvider` - Context provider for fidelity settings
- `useRenderProfile()` - Access current render profile
- `detectGPUCapabilities()` - GPU capability detection
- `RenderFidelity` - `'standard' | 'cinematic'`

### Earth Components

- `Earth` - Earth globe with rotation
- `UserMarker` - Observer position marker
- `Atmosphere` - Atmospheric glow effect

### Solar System Components

- `Sun` - Sun with corona effect
- `Planet` - Generic planet with axial tilt
- `SaturnRings` - Saturn ring system

### Galaxy Components

- `GalacticCenter` - Milky Way center marker
- `GalacticPlane` - Galaxy disc visualization

### CMB Components

- `CMBSphere` - CMB backdrop sphere

### Camera System

- `CameraRig` - Semantic zoom camera (preserves zoom across targets)
- `AnimatedCamera` - Simple animated camera
- `useCameraTransition()` - Transition state hook

### Effects

- `SceneEffects` - Post-processing (bloom, vignette)
- `useReducedMotion()` - Reduced motion preference

## Camera Semantic Zoom

The camera system uses "planetary radii" as zoom units:

```tsx
<CameraRig
  target={target}
  initialZoomRadii={8} // 8x target radius
  fitToView={false} // Preserve zoom when switching targets
/>
```

When switching targets, `zoomRadii` is preserved, making zoom feel consistent across bodies of different sizes.

## License

MIT
