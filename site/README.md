# Apex landing page

Next.js 16 + Tailwind v4. Components come from three registries through the shadcn CLI (`components.json`):

- **Kokonut UI** (`components/kokonutui/`): topo background, split-flap sign, attract button, status island, card stack, notification stack, activity terrain.
- **Bklit** (`components/charts/`): live line chart, particle line, gauge.
- **Motion** (`motion/react`): scroll parallax, word reveals, layout reorders, nav.

Kokonut's zinc scale is remapped to the app's paper palette in `app/globals.css`, so borrowed components match Apex without edits.

Trail numbers come from the app's catalog (`lib/trails.ts`, generated from `../data/catalogTrails.json`). Screens in `public/screens/` are captures of the app.

The Download buttons have no link yet; point them at the App Store listing at launch.

```bash
npm install
npm run dev
```
