# Assumptions and Constants

Every constant in this codebase is documented here with sources and uncertainty bounds.

## Time Constants

| Constant     | Value        | Uncertainty        | Source |
| ------------ | ------------ | ------------------ | ------ |
| Sidereal day | 86164.0905 s | ~0.0001 s          | NIST   |
| Solar day    | 86400 s      | exact (definition) | SI     |
| Julian year  | 31557600 s   | exact (definition) | IAU    |

## WGS84 Ellipsoid

| Constant            | Value            | Source   |
| ------------------- | ---------------- | -------- |
| Semi-major axis (a) | 6,378,137 m      | OGC/EPSG |
| Flattening (f)      | 1/298.257223563  | OGC/EPSG |
| Eccentricity² (e²)  | 0.00669437999014 | Derived  |

## Orbital Constants

| Constant                   | Value            | Uncertainty | Source   |
| -------------------------- | ---------------- | ----------- | -------- |
| Earth orbital velocity     | 29.78 km/s       | ~0.01 km/s  | NASA     |
| Earth orbital eccentricity | 0.0167086        | ~0.0001     | NASA     |
| 1 AU                       | 149,597,870.7 km | exact       | IAU 2012 |

## Galactic Constants

| Constant                     | Value     | Uncertainty | Source     |
| ---------------------------- | --------- | ----------- | ---------- |
| Solar galactic velocity      | 220 km/s  | ±15 km/s    | JPL        |
| Sun-galactic center distance | 26,000 ly | ~1,000 ly   | Reid+ 2019 |

## CMB Constants

| Constant                 | Value       | Uncertainty | Source   |
| ------------------------ | ----------- | ----------- | -------- |
| SSB-CMB velocity         | 369.82 km/s | ±0.11 km/s  | PDG 2025 |
| SSB-CMB direction (l)    | 264.021°    | ~0.01°      | PDG 2025 |
| SSB-CMB direction (b)    | 48.253°     | ~0.01°      | PDG 2025 |
| Local Group-CMB velocity | 620 km/s    | ±15 km/s    | PDG 2025 |

## Key Assumptions

1. **Tier A simplifications**: Uses mean velocities, ignoring orbital eccentricity variations
2. **Galactic velocity**: Treated as constant (galactic orbit period ~225 Myr)
3. **CMB frame**: Uses SSB as reference point for individual observers
4. **Leap seconds**: Ignored (negligible effect on distance calculations)
5. **Relativistic effects**: Ignored (velocities << c)

## Sources

- NIST: https://tf.nist.gov/general/pdf/1530.pdf
- OGC/EPSG: https://docs.ogc.org/bp/16-011r5.html
- NASA Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- JPL Night Sky Network: https://nightsky.jpl.nasa.gov/docs/HowFast.pdf
- PDG 2025: https://ccwww.kek.jp/pdg/2025/reviews/rpp2025-rev-cosmic-microwave-background.pdf
