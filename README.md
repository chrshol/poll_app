# Intern Wrapped

Real-time polling app med Spotify Wrapped-estetikk. To interns presenterer seg — kontoret stemmer og finner ut hvem de ligner mest på.

## Oppsett

### 1. Pusher

1. Gå til [pusher.com](https://pusher.com) og opprett en gratis konto
2. Opprett en ny **Channels**-app
3. Velg cluster (f.eks. `eu`)
4. Kopier `App ID`, `Key`, `Secret`, og `Cluster` fra "App Keys"-fanen

### 2. Upstash Redis

1. Gå til [upstash.com](https://upstash.com) og opprett en gratis konto
2. Opprett en ny Redis-database (velg regionen nærmest Vercel-deployment)
3. Kopier `UPSTASH_REDIS_REST_URL` og `UPSTASH_REDIS_REST_TOKEN` fra "REST API"-fanen

### 3. Miljøvariabler

Kopier `.env.local.example` til `.env.local` og fyll inn verdiene:

```bash
cp .env.local.example .env.local
```

```env
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=eu

NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=eu

UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

HOST_PASSWORD=dittPassord
```

> **Merk:** `NEXT_PUBLIC_PUSHER_KEY` og `NEXT_PUBLIC_PUSHER_CLUSTER` må ha samme verdier som de server-side variablene — de eksponeres til nettleseren.

### 4. Lokal utvikling

```bash
npm install
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000)

### 5. Deploy til Vercel

1. Push koden til GitHub
2. Importer repoet på [vercel.com](https://vercel.com)
3. Legg til alle miljøvariablene under **Settings → Environment Variables**
4. Deploy!

---

## Sider

| Side | Beskrivelse |
|------|-------------|
| `/vote` | Publikumssiden — stem via QR-kode eller URL |
| `/host` | Vertspanel — åpne/lukke/avsløre spørsmål (passord-beskyttet) |
| `/results` | Oppsummeringsside — vis på storskjerm på slutten |

## Flyt

1. Host åpner `/host` og logger inn med `HOST_PASSWORD`
2. Publikum åpner `/vote` (vis QR-kode eller del lenken)
3. Host klikker **Åpne avstemning** for spørsmål 1
4. Publikum stemmer — kun én stemme per spørsmål (lagres i localStorage)
5. Host klikker **Lukk avstemning**, deretter **Avslør resultater**
6. Resultater vises live på `/vote` og `/results`
7. Gjenta for alle 5 spørsmål
8. Vis `/results` på storskjerm for endelig oppsummering

## Spørsmål

| # | Team 1 | Team 2 |
|---|--------|--------|
| 1 | Sommer ☀️ | Vinter ❄️ |
| 2 | Katt 🐱 | Hund 🐶 |
| 3 | Pepsi 🔵 | Cola 🔴 |
| 4 | B-menneske 🌙 | A-menneske 🌅 |
| 5 | Norsk sommer 🏔️ | Utenlands sommer ✈️ |
