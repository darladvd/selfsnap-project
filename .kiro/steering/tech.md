# SelfSnap — Tech Stack & Build

## Frontend (`selfsnap-web/`)

- **Framework**: Vue 3 (Composition API with `<script setup lang="ts">`)
- **Language**: TypeScript
- **Build tool**: Vite 7
- **Styling**: Tailwind CSS 3 + PostCSS + Autoprefixer
- **Routing**: Vue Router 4 (history mode)
- **Icons**: Font Awesome 7 (free, via `@fortawesome/fontawesome-free`)
- **Type checking**: vue-tsc
- **Path alias**: `@` → `./src` (configured in vite.config.ts and tsconfig)

### Frontend Commands

```bash
# From selfsnap-web/
npm run dev        # Start Vite dev server
npm run build      # Type-check (vue-tsc) then build for production
npm run preview    # Preview production build locally
npm run deploy     # Build + sync to S3 + CloudFront invalidation
```

## Backend (root `/`)

- **Runtime**: Node.js (ES modules, `"type": "module"`)
- **Infrastructure**: AWS SAM (serverless)
- **Services**: AWS Lambda, API Gateway, DynamoDB, S3, CloudFront
- **AWS SDK**: `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3)
- **Testing**: Jest 29 with `--experimental-vm-modules` for ESM support
- **Mocking**: `aws-sdk-client-mock`
- **Region**: `ap-southeast-1`

### Backend Commands

```bash
# From project root
npm test           # Run Jest tests (ESM mode)
sam build          # Build SAM application
sam deploy         # Deploy to AWS (uses samconfig.toml defaults)
sam local start-api  # Run API locally
```

## Deployment

- Frontend is deployed as static files to S3 behind CloudFront CDN.
- Backend is deployed via AWS SAM (CloudFormation).
- CI uses AWS CodeBuild (`buildspec.yml`): install → test → prune → package.

## Key Conventions

- Frontend uses Vue SFCs with `<script setup lang="ts">` exclusively.
- No state management library; views share data via `sessionStorage`.
- Canvas operations use a shared layout function (`compute4GridSlots`) for consistency between preview and output.
- Backend Lambda handlers export an `async handler` function using ES module syntax.
- Environment variables for the frontend are prefixed with `VITE_` (e.g., `VITE_API_BASE`).
