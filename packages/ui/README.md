# @worldline-kinematics/ui

React UI components for cosmic journey visualization. Built on Radix primitives with Tailwind CSS.

## Installation

```bash
pnpm add @worldline-kinematics/ui
```

Peer dependencies:

```bash
pnpm add react react-dom
```

## Usage

```tsx
import {
  DateSlider,
  JourneyDrawer,
  LanguageSwitcher,
  SpeedHUD,
} from '@worldline-kinematics/ui';

function App() {
  return (
    <>
      <DateSlider value={date} onChange={setDate} birthDate={birthDate} />
      <JourneyDrawer isOpen={isOpen} onOpenChange={setIsOpen} worldlineState={state} />
      <LanguageSwitcher />
      <SpeedHUD velocityKms={29.78} frame="orbit" />
    </>
  );
}
```

## Exports

### Input Components

- `DateInput` - Date entry with validation
- `DatePickerInput` - Date picker with calendar
- `DateSlider` - Timeline slider with view modes
- `LatitudeSlider` - Latitude selection
- `ModeSelector` - Reference frame selector
- `CameraControls` - Zoom/rotate controls
- `FidelityToggle` - Visual quality toggle
- `LanguageSwitcher` - Locale selector (12 languages)

### Display Components

- `SpeedHUD` - Velocity display
- `InfoModal` - Information dialog

### Drawer Components

- `JourneyDrawer` - Full journey breakdown drawer
- `JourneyModal` - Journey summary modal
- `JourneyHUD` - Compact journey display
- `JourneyBreakdown` - Frame-by-frame breakdown
- `JourneyConversions` - Unit conversion display

### Layout Components

- `PrivacyFooter` - Privacy notice footer

### Icons

- `IconOrbit`, `IconSpin`, `IconGalaxy`, `IconCMB`
- `IconZoomIn`, `IconZoomOut`, `IconSettings`
- And more...

### Hooks

- `useLocale()` - Current locale
- `useLocaleWithSetter()` - Locale with setter
- `useShareJourney()` - Share functionality

### Utilities

- `cn(...classes)` - Class name merger
- `formatLightTime(seconds)` - Light travel time formatter
- `formatDateTime(date, locale)` - Date/time formatter
- `formatNumber(n, locale)` - Number formatter
- `formatCompactNumber(n, locale)` - Compact number formatter

### Locale Support

- `SUPPORTED_LOCALES` - Array of locale codes
- `LOCALE_NAMES` - Locale display names
- `DEFAULT_LOCALE` - Default locale (`'en'`)

Supported: en, pt, es, fr, de, it, ja, ko, zh, ru, pl, da

## License

MIT
