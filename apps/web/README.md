# @worldline-kinematics/web

Next.js web application for worldline kinematics visualization.

## Development

```bash
# From monorepo root
pnpm dev

# Or from this directory
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
pnpm start
```

## Testing

E2E tests with Playwright:

```bash
pnpm test:e2e           # Run all tests
pnpm test:e2e:ui        # Interactive UI mode
pnpm test:e2e:headed    # Run with browser visible
pnpm test:e2e:debug     # Debug mode
```

## Project Structure

```
apps/web/
├── app/
│   ├── [locale]/       # Localized routes
│   ├── globals.css     # Global styles
│   └── layout.tsx      # Root layout
├── components/         # React components
├── config/             # App configuration
├── contexts/           # React contexts
├── e2e/                # Playwright tests
├── hooks/              # Custom hooks
├── i18n/               # i18n configuration
├── locales/            # Translation files (12 languages)
└── public/             # Static assets
```

## Localization

Supported locales: en, pt, es, fr, de, it, ja, ko, zh, ru, pl, da

Translation files in `locales/{locale}/app.json`.

## Dependencies

Uses workspace packages:

- `@worldline-kinematics/core` - Physics calculations
- `@worldline-kinematics/astro` - Ephemerides and data
- `@worldline-kinematics/scene` - 3D visualization
- `@worldline-kinematics/ui` - UI components

## Environment Variables

See `.env.example` for available configuration.

## License

MIT
