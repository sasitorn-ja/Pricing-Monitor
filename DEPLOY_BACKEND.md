# Deploying the Express backend (pricing-monitor)

This document shows simple options to deploy the `server/` Express API separately from the frontend.

Important notes:
- The project uses SQLite and a CLI-based import (`scripts/import-data.ts`) which invokes the `sqlite3` binary. Many serverless platforms have an ephemeral filesystem and may not include the `sqlite3` CLI by default.
- `better-sqlite3` is a native Node module. If you run into build problems on the host, consider using a Docker deployment or moving to a hosted DB (Postgres) for reliability.

Options
-------

1) Render (recommended for quick deploy)

- Create a new Web Service on Render.
- Connect your GitHub repo and set the Root to the project root.
- Build Command: `npm ci && npm run import-data`
  - This will install dependencies and create the SQLite DB at `storage/pricing-monitor.db`.
  - If Render's build environment does not include the `sqlite3` CLI, use the Docker option below.
- Start Command: `npm start`
- Environment: none required for a basic deploy. If you later host the API under a custom domain, set `VITE_API_BASE` in Vercel frontend.

Notes about persistence:
- Render's filesystem is ephemeral for free services; use a Persistent Disk (paid) or use a hosted DB. If you cannot use persistent storage, the DB created during build may be lost when instances scale.

2) Railway

- Railway can run `npm start` directly. However, the same concerns about `sqlite3` binary and persistence apply.
- If you want a predictable environment, use a Docker deployment (see below).

3) Docker (most reliable)

- Use a Dockerfile that installs `sqlite3`, creates the DB during image build (or copies it from repo), and runs the Node server.

Example Dockerfile

```
FROM node:20-alpine

RUN apk add --no-cache sqlite sqlite-dev build-base

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Copy app files
COPY . .

# Create DB during build (alternatively copy prebuilt DB)
RUN npm run import-data

EXPOSE 8787
CMD ["npm", "start"]
```

Then build and push the image to your chosen container host (Docker Hub, Render with Docker, Fly.io, etc.). Docker ensures the native binary and build tools are present.

Quick checklist

- [ ] Decide whether to keep SQLite in production or move to hosted DB.
- [ ] If keeping SQLite: choose Render with persistent disk or deploy via Docker.
- [ ] Add `Procfile` (included) or set Start Command to `npm start` on your host.
- [ ] Run `npm run import-data` during build to generate `storage/pricing-monitor.db`, or include the DB in the image.

Vercel note

- This repository now exposes the API through `api/*.ts`, so the frontend and backend can live in the same Vercel project.
- `npm run build` creates `storage/pricing-monitor.db` from `data.csv` during the build, so the deployed functions can read the database directly.
