# Immigration Journey Installation

An interactive public-history experience exploring how immigration shaped American families and demographics, especially after the 1965 Immigration and Nationality Act.

## Features

- Cinematic welcome screen and surname-based journey input
- **FamilySearch** person search & ancestry (primary, when configured)
- WikiTree genealogical search (fallback, with illustrative modeled stories)
- Animated migration map with glowing arcs
- Immigration timeline (laws, family milestones, historical events)
- Force-directed family tree visualization
- Census demographic charts (API + curated fallbacks)
- Counterfactual “America without the 1965 Act” educational simulation
- Historical figures explorer

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion, D3.js, react-force-graph-2d
- **Backend:** Next.js API routes (WikiTree proxy, Census, Ellis Island curated data)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### FamilySearch setup (recommended)

1. Create a free app at [FamilySearch Developers](https://www.familysearch.org/developers/)
2. Copy your **App Key** (client ID)
3. Create `.env.local`:

```bash
FAMILYSEARCH_CLIENT_ID=your-app-key-here
WIKITREE_APP_ID=ImmigrationJourneyDemo
```

The app uses FamilySearch’s **unauthenticated session** for public tree search and ancestry (no user login required). Search is tried first; WikiTree and modeled fallbacks run if FamilySearch is unavailable or returns no matches.

### Example journey

1. Click **Start Journey**
2. Enter surname `Patel`, country `India`, decade `1970s`
3. View migration map, timeline, family tree, and demographics

## Data & Ethics

The installation clearly distinguishes:

- **Historical records** (curated Ellis Island data, WikiTree public API)
- **Inferred connections** (migration paths when no record match)
- **Simulations** (counterfactual demographic modeling)

It does not claim uncertain ancestry as fact or expose private living-person data.

## Project Structure

```
src/
  components/   # UI visualizations
  pages/        # Routes + API handlers
  services/     # Census, FamilySearch, WikiTree, Ellis Island logic
  data/         # Curated JSON datasets
  lib/          # Journey builder utilities
```

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm run dev` | Development server   |
| `npm run build` | Production build   |
| `npm start`   | Run production build |
