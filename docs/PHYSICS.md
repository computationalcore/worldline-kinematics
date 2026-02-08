# Physics Model

This document describes the physics model used in Worldline Kinematics.

## Reference Frames

### 1. Spin (Earth Rotation)

The tangential velocity at latitude φ due to Earth's rotation.

**Model**: WGS84 ellipsoid

```text
Semi-major axis: a = 6,378,137 m
Flattening: f = 1/298.257223563

Eccentricity squared: e² = f(2 - f)
Prime vertical radius: N(φ) = a / √(1 - e²sin²φ)
Parallel radius: r(φ) = N(φ)cos(φ)
Angular velocity: ω = 2π / 86164.0905 rad/s

Tangential velocity: v_spin(φ) = ω × r(φ)
```

**Sources**:

- WGS84 parameters: OGC/EPSG (https://docs.ogc.org/bp/16-011r5.html)
- Sidereal day: NIST (https://tf.nist.gov/general/pdf/1530.pdf)

### 2. Orbit (Heliocentric)

Earth's velocity relative to the Sun.

**Tier A (Analytic)**:

- Mean velocity: 29.78 km/s
- Source: NASA Planetary Fact Sheet

**Tier B (Ephemerides)**:

- Integrates actual orbital position over time
- Uses astronomy-engine library

### 3. Galaxy (Galactocentric)

Solar System velocity around the Milky Way center.

**Value**: ~220 km/s
**Uncertainty**: ±15 km/s
**Source**: JPL Night Sky Network (https://nightsky.jpl.nasa.gov/docs/HowFast.pdf)

Note: This value has significant astrophysical measurement uncertainty.

### 4. CMB (Cosmic Microwave Background)

Solar System Barycenter velocity relative to the CMB rest frame.

**Value**: 369.82 ± 0.11 km/s
**Direction**: Galactic (l,b) = (264.021°, 48.253°)
**Source**: Particle Data Group 2025 Review

Alternative reference (toggle-able):

- Local Group velocity: ~620 ± 15 km/s

## Distance Calculation

For Tier A, distance = velocity × time.

For Tier B, distance = ∫|v(t)|dt integrated over the duration.
