
# ✅ Plinko Lab — Provably Fair (Backend + Core Engine)

This project implements a **provably‑fair Plinko game** using:

- `plinko-core` → deterministic plinko engine (TypeScript)
- `Next.js App Router` backend → `/api/rounds/*` provably‑fair flow
- `Prisma + PostgreSQL` → round data persistence
- Cryptographic flow: **commit → start → reveal → verify**

> ⚠️ NOTE: This README includes _only_ what we have already completed.  
> No new animation or visual UI changes are included here.

---

## 📦 Project Structure

```
plinko-core/          ← deterministic plinko engine (NO framework)
plinko-lab/           ← Next.js backend + API routes + DB
├── app/
│   ├── api/
│   │   └── rounds/
│   │       ├── commit/route.ts
│   │       ├── [id]/start/route.ts
│   │       ├── [id]/route.ts
│   └── verify/route.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── lib/
    ├── prisma.ts
    ├── crypto.ts
    └── engine.ts
```

---

## ✅ PART 1 — plinko-core setup (Engine Test)

Inside `plinko-core` folder:

```sh
npm install
npm run testvec
```

Expected Output ✅

```
Engine test passed:
 - pegMap first rows match expected
 - dropColumn=6 ⇒ binIndex=6
```

This confirms the core deterministic engine works exactly like the assignment expects.

---

## ✅ PART 2 — Next.js Backend Setup

Create a new Next.js project (`plinko-lab`):

```sh
npx create-next-app@latest plinko-lab
```

Install dependencies:

```sh
npm install prisma @prisma/client
```

Create **Prisma** folder:

```
plinko-lab/prisma/schema.prisma
```

Paste schema:

```prisma
model Round {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  status          String
  nonce           String
  commitHex       String
  serverSeed      String?
  clientSeed      String
  combinedSeed    String
  pegMapHash      String
  rows            Int
  dropColumn      Int
  binIndex        Int
  payoutMultiplier Float
  betCents        Int
  pathJson        Json
  revealedAt      DateTime?
}
```

Run DB migration:

```sh
npx prisma migrate dev --name init
```

---

## ✅ PART 3 — lib/prisma.ts

Create `plinko-lab/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## ✅ PART 4 — API Endpoints (Commit ➝ Start ➝ Reveal)

### ✅ `/api/rounds/commit` (GENERATES SERVER SEED + COMMIT HEX)

```sh
curl -s -X POST http://localhost:3000/api/rounds/commit
```

Returns:

```json
{"id":"cmhngppzr0001sabki3gsy9ae","nonce":"626594489","commitHex":"3003....ea46"}
```

---

### ✅ `/api/rounds/[id]/start` (CLIENT SEED + DROPCOLUMN)

```sh
curl -i -X POST "http://localhost:3000/api/rounds/<id>/start"   -H "Content-Type: application/json"   --data '{"clientSeed":"aaa500-test","betCents":2500,"dropColumn":6}'
```

Example response:

```json
{"roundId":"cmhngppzr0001sabki3gsy9ae","pegMapHash":"b7e9...41b2","rows":12,"binIndex":4,"payoutMultiplier":1.2}
```

---

### ✅ `/api/rounds/[id]` (REVEAL — SERVER SEED SHOWN AFTER ROUND)

```sh
curl -s "http://localhost:3000/api/rounds/cmhngppzr0001sabki3gsy9ae"
```

Shows the full reveal including pathJson:

```json
{
  "id": "cmhngppzr0001sabki3gsy9ae",
  "status": "REVEALED",
  "serverSeed": "...",
  "clientSeed": "aaa500-test",
  "pathJson": ["R","L","L","R",...]
}
```

---

## ✅ PART 5 — Verification Route `/api/verify`

```sh
curl -s "http://localhost:3000/api/verify?serverSeed=$SERVER&clientSeed=$CLIENT&nonce=$NONCE&dropColumn=$DROP"
```

Returns:

```json
{"commitHex":"3003...ea46","combinedSeed":"620e...c51e","pegMapHash":"b7e9...41b2","binIndex":4,"rows":12}
```

Meaning: ✅ **Client can independently verify fairness**.

---

## 🚀 Deployment (Next + Prisma + PostgreSQL)

Before deployment, set environment variable in `.env`:

```
DATABASE_URL="postgresql://user:password@host:5432/plinko"
```

Then deploy with:

```
npx prisma generate
npm run build
```

If deploying to **Vercel**, ensure you:

✅ Add the same DATABASE_URL in Vercel → Settings → Environment Variables  
✅ Enable "Prisma Data Proxy" *(optional but recommended)*

---

## 🎉 Status

| Feature | Status |
|---------|--------|
| Deterministic plinko engine (`plinko-core`) | ✅ |
| DB + Prisma setup & migration | ✅ |
| API commit → start → reveal → verify | ✅ |
| Provably-fair output tested via curl | ✅ |
| UI/animation layer | ⏳ (not included in README) |

---

> You now have a **fully functional backend + cryptographically fair Plinko engine**, verified end‑to‑end.

