# Voxcript

AI-powered subtitle generation. Upload a short video, get back a real SRT
subtitle file transcribed by a local Whisper model.

- **Web UI**: https://cdn.voxcript.app
- **API**: https://api.voxcript.app
- **Grafana dashboard**: https://grafana.voxcript.app (admin / see defense notes)

## What it does

1. User selects a video in the browser.
2. The browser uploads it to the API (`POST /api/v1/jobs`). The API validates
   the file with `ffprobe` (format, duration, resolution, audio track).
3. A Postgres-backed queue accepts the job. A single worker pod claims it
   with `SELECT … FOR UPDATE SKIP LOCKED`.
4. The worker extracts the audio track with `ffmpeg`, runs `whisper.cpp`
   with the `ggml-tiny` quantized multilingual model (baked into the worker
   image, no external calls), and produces `result.srt`.
5. The browser polls the job until it's `done`, then offers a
   "Download SRT" link that hits `GET /api/v1/jobs/:id/srt` with the
   per-job access token.

Everything — AI inference, video decoding, encoding, queue, storage — runs
on a single Hetzner CPX32 (4 vCPU / 8 GB) inside k3s. No cloud AI services,
no external transcription APIs.

## The chain — upload to download

The full request flow, one file's journey through the system:

```
[ Browser ]
    │ 1. Clicks "Upload"
    ▼
[ Traefik Ingress ] (terminates HTTPS)
    │ 2. Routes to API
    ▼
[ API Pod (Fastify) ]
    │ 3. Saves video to shared volume (/tmp/voxcript/<id>/input)
    │ 4. Inserts row in database (status: "queued")
    │ 5. Returns 201 + access token to browser
    ▼
[ Database (PostgreSQL) ] ◄────────┐
    │ 6. Worker polls every 2s      │
    ▼                              │
[ Worker Pod (whisper.cpp) ]       │ 9. Updates status to "done"
    │ 7. Reads video from volume   │
    │ 8. Runs FFmpeg + Whisper     │
    │    Saves SRT to volume       │
    └──────────────────────────────┘

[ Browser ] (polling every 2 seconds)
    │ 10. Sees status: "done"
    │ 11. Clicks "Download SRT"
    ▼
[ API Pod ] ── reads SRT from volume ──► returns file to browser
```

Notes that matter when explaining the chain:

- The shared volume is mounted at `/tmp/voxcript` inside both the API and
  worker pods; on the host it is `/var/lib/voxcript/media`. One `hostPath`,
  two containers — that's how the API can hand work to the worker without
  passing bytes through HTTP, and why the API can answer `201` immediately
  while the worker processes asynchronously.
- The worker never gets pushed anything — it polls Postgres every 2 seconds
  and claims work with `SELECT … FOR UPDATE SKIP LOCKED`, so multiple
  workers can never claim the same job twice.

## Architecture

```
                    Internet
                       │
                       ▼
            ┌──────────────────┐
            │  Traefik (ingress)│  TLS via cert-manager + Let's Encrypt
            └─────────┬─────────┘
                      │
       ┌──────────────┼─────────────────┐
       ▼              ▼                 ▼
 cdn.voxcript.app  api.voxcript.app  grafana.voxcript.app
   (nginx ×2)      (Fastify ×2,      (Grafana + Prometheus,
                    HPA 2→4)          ns monitoring)
                       │
                       ├─── Postgres 16 (StatefulSet, 10Gi PVC)
                       │
                       └─── Worker ×1 (whisper.cpp + ffmpeg,
                                       reads/uploads via shared
                                       hostPath media volume)
```

- **Runtime**: Node 22, Fastify 5, TypeScript strict, Prisma 6 on Postgres 16
- **Orchestration**: k3s single-node, Traefik ingress, cert-manager (Let's Encrypt DNS-01 via Cloudflare)
- **Images**: `ghcr.io/darunbjork/voxcript-{api,worker,web}`, built on the VPS by
  the Deploy workflow on every merge to main
- **CI**: GitHub Actions runs `quality`, `Lint → Type-check → Test → Build`
  (with a real Postgres service container), and `e2e` (Playwright against a
  docker-compose stack with real whisper.cpp) on every PR. All three are
  required to merge.
- **CD**: on merge to main, `Deploy` builds the three images on the VPS,
  pushes them to GHCR, then SSHes into the server and does
  `kubectl set image` to the new digests, waits for the rollout, and
  smoke-tests `GET /health` and `GET /api/v1/status`.
- **Backups**: a daily Kubernetes CronJob runs `pg_dump -Fc` and uploads the
  dump to Cloudflare R2 (`voxcript-db-backups-2026` bucket).
- **Monitoring**: `kube-prometheus-stack` in the `monitoring` namespace.
  Grafana at `grafana.voxcript.app` shows Kubernetes cluster health,
  API server SLOs, and per-namespace compute resources.

## Repo layout

```
packages/
├── shared/   # @transcribe/shared — API contract, error codes, DTOs, job view
├── api/      # @transcribe/api    — Fastify server + worker + pipeline
└── web/      # @transcribe/web    — React + Vite SPA, uploads and downloads
k8s/          # Kubernetes manifests (postgres, worker, web + ingress,
              #   backup-cronjob, monitoring stack)
docker-compose.e2e.yml         # Local end-to-end test stack
Dockerfile.api · Dockerfile.worker · Dockerfile.web
```

## Running locally

```bash
pnpm install
pnpm -r build
pnpm -r test                # unit + integration tests
pnpm --filter @transcribe/api run dev        # API on :3000
pnpm --filter @transcribe/api run worker     # worker in a second terminal
pnpm --filter @transcribe/web run dev        # web on :5173
```

Prerequisites: Node 22, pnpm 9, Docker, Postgres 16 (or use `docker run postgres:16-alpine`).

## Tests

- **Unit**: Vitest. Error handling, runProcess, media validation, job state
  machine, token helpers, SRT shape.
- **Integration**: Vitest against a real Postgres 16 (CI provides a
  `postgres:16-alpine` service container). Concurrency tests prove
  `SELECT … FOR UPDATE SKIP LOCKED` gives exactly one winner when five
  workers race for one job.
- **End-to-end**: Playwright against `docker-compose.e2e.yml` — uploads a
  real mp4, polls until `done`, downloads the SRT, and asserts it contains
  real transcribed text (not a placeholder). Runs on every PR in CI.

## Deployment

Merges to `main` automatically deploy:

1. `CI` runs on the merge commit (`quality`, `Lint → Type-check → Test → Build`, `e2e`).
2. On CI success, `Deploy` builds `voxcript-{api,worker,web}` on the VPS,
   pushes to GHCR, and does a rolling `kubectl set image` to the immutable
   digests.
3. A smoke test hits `https://api.voxcript.app/health` and `/api/v1/status`
   from the workflow before declaring success.

## How a change ships (branch → image → production)

The walk-through for the examiner's favorite question: _"You change one line
of code — what happens until it runs in production?"_

1. **Create a branch.** Everything starts from `main`, which is protected —
   direct pushes are rejected:

   ```bash
   git checkout -b fix-ui-typo
   ```

2. **Make the change and run the local gate** — the same checks CI runs:

   ```bash
   pnpm run quality        # build + typecheck + lint + format:check
   pnpm run test           # unit + integration tests (needs Postgres)
   ```

3. **Push and open a pull request.** GitHub Actions fires the `CI`
   workflow with three jobs:

   - `quality` — install (frozen lockfile), build, typecheck, lint, format
   - `Lint → Type-check → Test → Build` — unit + integration tests against
     a real `postgres:16` service container, after `prisma migrate deploy`
   - `e2e` — starts once `quality` passes: `docker compose -f
docker-compose.e2e.yml up --build` compiles the full stack with real
     whisper.cpp, then Playwright uploads a real mp4, polls until `done`,
     downloads the SRT and asserts it contains real transcribed text

   All three are required checks — the merge button stays disabled until
   every one is green.

4. **Merge to main.** The merge commit triggers `CI` again on `main`: the
   same three jobs must pass on the exact commit that is about to ship.

5. **Build the new images.** When `CI` is green on `main`, the `Deploy`
   workflow starts (it is triggered by workflow_run on CI success). It
   SSHes into the VPS with a fingerprint-pinned host key, checks out the
   exact `head_sha` CI validated, and runs `docker build` three times —
   `voxcript-api`, `voxcript-worker`, `voxcript-web`. Each image is pushed
   to GHCR as both `:sha-<commit>` and `:latest`; build layers are cached,
   so only what changed rebuilds.

6. **Roll out with zero downtime.** Still on the server, the workflow runs
   `kubectl set image` pointing each Deployment at the immutable
   `@sha256:...` digest — never a mutable tag. The API Deployment runs
   with `maxUnavailable: 0, maxSurge: 1`: a new pod must pass its `/ready`
   probe before any old pod is removed, and `preStop sleep 10` drains
   in-flight requests first. Measured on production: 900 requests during a
   live rollout, 900 × HTTP 200, 0 failures.

7. **Verify — or fail loudly.** `kubectl rollout status` waits for the new
   pods, then the workflow smoke-tests `GET /health` and
   `GET /api/v1/status` against the live domain. If anything fails, the
   workflow turns red in Actions — and the previous ReplicaSet is still
   one `kubectl rollout undo` away.

## Security and operations

- TLS everywhere via Let's Encrypt DNS-01, auto-renewed by cert-manager
- API and worker run as non-root, with seccomp and read-only-capable containers
- Secrets are `kubectl create secret`'d on the server; nothing sensitive is
  in git
- Daily R2 backups (`pg_dump -Fc` to Cloudflare R2), proven by manual runs
- Prometheus metrics and Grafana dashboards for cluster health, API server
  SLOs, and per-namespace compute resources
- Every merge rebuilds and re-deploys; failed deploys visibly fail the
  workflow without rolling back the previous green release

## Known limits (honest)

- Single-node k3s — not HA. One node failure stops the service until it
  reboots. The backup CronJob and the deployed images are reproducible from
  the repo + a Postgres dump.
- The worker runs with a `ggml-tiny` quantized model — good for short clips
  (≤60s as configured); a longer clip or a heavier model would need a bigger
  node.
- The media volume is a single-node `hostPath`, which is fine for one node
  but would need to be replaced by object storage or RWX storage for any
  multi-node setup.
- Whisper.cpp is spawned per job; a hung child process is killed by the
  process-group timeout, but the model is not kept warm between jobs.
