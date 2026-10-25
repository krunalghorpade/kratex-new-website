# Kratex website

The existing site, refined with a grain-textured editorial design. All original home sections, links, the About page, and the Orkut page remain in place.

## Run with Node.js

Requires Node.js 22 or newer. No packages need to be installed.

```sh
npm run dev
```

Open http://127.0.0.1:3000. Use `npm start` without the file watcher. `PORT` and `HOST` can be configured with environment variables.

## Check and build

```sh
npm run check
npm run build
```

The checks guard the original destination links and section order, validate local resources, and exercise the Node server and video range responses. `dist/` is a standalone static version for the existing host. To preview the build, use `SERVE_DIST=1 npm start`.

## Editing

- `index.html` and `about/index.html`: content and links.
- `style.css` and `mobile.css`: design and responsive layouts.
- `script.js`: navigation, collection controls, motion preferences, event loading, and subscription handoff.
- `settings.json`: photo-strip timing (`aboutCarouselSpeed`).
- `scripts/content-manifest.json`: original destination links and section order used by the preservation check.

The live shows come from the existing Bandsintown integration. A direct Bandsintown link remains available if the service cannot be reached. The email form continues to Bandsintown for subscription confirmation. Spotify, YouTube thumbnails, and shop images use their existing external sources. No forms are submitted automatically.

Reduced-motion preferences disable automatic motion; the hero also has a visible pause control. Collection rails support touch, arrow buttons, and keyboard arrow keys. The mobile menu supports Escape and keyboard focus containment.
