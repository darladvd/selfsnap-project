# SelfSnap — Project Structure

```
selfsnap/
├── .kiro/steering/          # AI steering rules
├── src/                     # Backend Lambda handlers
│   └── ingestFrame.js       # S3 event → DynamoDB (frame ingestion)
├── selfsnap-web/            # Frontend Vue application
│   ├── src/
│   │   ├── App.vue          # Root component (radial background + router-view)
│   │   ├── router.ts        # Vue Router config (/, /settings, /booth, /result)
│   │   ├── views/           # Page-level components (one per route)
│   │   │   ├── LandingView.vue   # Entry screen
│   │   │   ├── SettingsView.vue  # Frame/filter/timer selection
│   │   │   ├── BoothView.vue     # Camera + capture sequence
│   │   │   └── ResultView.vue    # Canvas composition + download/share
│   │   ├── lib/             # Shared utility modules
│   │   │   ├── layout.ts    # compute4GridSlots — shared grid math
│   │   │   ├── filters.ts   # CSS filter string helpers
│   │   │   └── time.ts      # sleep utility
│   │   ├── components/      # Reusable UI components (currently empty)
│   │   ├── assets/          # Static assets bundled by Vite
│   │   └── style.css        # Global styles + Tailwind directives
│   ├── public/              # Static assets served as-is
│   ├── index.html           # Vite entry HTML
│   ├── vite.config.ts       # Vite config (vue plugin, @ alias)
│   ├── tailwind.config.js   # Tailwind config (custom radial gradient)
│   ├── postcss.config.js    # PostCSS (tailwind + autoprefixer)
│   ├── tsconfig.json        # Root TS config (references app + node)
│   ├── tsconfig.app.json    # App TS config (src code)
│   └── tsconfig.node.json   # Node TS config (vite.config)
├── package.json             # Backend deps + Jest config
├── samconfig.toml           # AWS SAM deployment config
├── buildspec.yml            # AWS CodeBuild pipeline definition
└── README.md                # Project documentation
```

## Architecture Notes

- **Monorepo with two packages**: root is the backend (Lambda), `selfsnap-web/` is the frontend (Vue SPA). Each has its own `package.json` and `node_modules`.
- **Views are self-contained**: Each view manages its own state and side effects via Composition API. No shared store — data flows through `sessionStorage`.
- **`lib/` is for pure utility functions**: Layout math, filter helpers, and timing. These must remain framework-agnostic (no Vue imports).
- **New Lambda handlers** go in `src/` as `.js` files exporting `handler`.
- **New frontend pages** go in `selfsnap-web/src/views/` and must be registered in `router.ts`.
- **Reusable UI pieces** go in `selfsnap-web/src/components/`.
