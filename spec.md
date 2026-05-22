Immigration Journey Installation — Technical Spec
Project Overview

An interactive public-history installation that helps visitors explore how immigration shaped American families and demographics, especially after the 1965 Immigration and Nationality Act.

Users:

enter a surname
optionally enter ancestral country
optionally search a historical person

The system then generates:

a personalized immigration timeline
ancestor/family-tree visualizations
migration maps
demographic comparisons
historical context
Core Concept

The installation combines:

Real historical people
Public immigration records
U.S. Census demographic data
Interactive storytelling

The experience should feel:

emotional
educational
visually cinematic
museum-quality
MVP Goals
MUST HAVE
Name/surname input
Historical timeline
Migration map animation
Census demographic visualization
Family tree visualization
Real historical records integration
NICE TO HAVE
AI narration
Voice interaction
Facial scanning
Large touch-screen mode
Multiplayer/public mode
“America without 1965 Act” simulation
Tech Stack
Frontend
Recommended
React
Next.js
TailwindCSS
Framer Motion
Visualization
D3.js
Mapbox GL JS
react-force-graph
Timeline
vis-timeline
OR
custom D3 timeline
Backend
Runtime
Node.js
Express
Database
MVP
SQLite
Production
PostgreSQL
APIs
1. U.S. Census API

Primary demographic/statistical source.

Use for:

foreign-born population
ancestry demographics
state changes
immigration trends
Example Uses
“Indian-American population after 1965”
“Foreign-born population growth”
“How California changed”
2. WikiTree API

Primary genealogy source.

Use for:

ancestors
descendants
historical people
family relationships
Important Endpoints
Search Person
POST https://api.wikitree.com/api.php

Parameters:

{
  "action": "searchPerson",
  "FirstName": "George",
  "LastName": "Washington"
}
Get Ancestors
{
  "action": "getAncestors",
  "key": "Washington-1",
  "depth": 4
}
3. Ellis Island Records

Use for:

passenger journeys
ship manifests
arrival years

Can initially be:

manually curated
CSV-based
User Flow
1. Welcome Screen

Fullscreen cinematic intro:

“Every American story begins somewhere.”

Buttons:

Start Journey
Explore Historical Figures
Explore America After 1965
2. User Input

Inputs:

surname
country of origin
immigration decade (optional)

Example:

Patel
India
1970s
3. Family Discovery

System attempts:

WikiTree search
surname matching
demographic matching

Returns:

possible ancestors
related immigration waves
migration paths
4. Timeline Experience

Animated timeline:

immigration year
historical events
census changes
family milestones

Example:

1968 — Immigration Act expands Asian immigration
1972 — Family arrives in California
1985 — Population boom in Bay Area
5. Migration Map

Animated world map:

origin country
migration route
settlement city

Visual style:

glowing arcs
animated particles
cinematic transitions
6. Demographic Visualization

Use Census API to show:

ancestry growth
regional changes
population shifts

Charts:

line graphs
animated choropleths
stacked demographics
7. Counterfactual Simulation

“What if the 1965 Act never passed?”

Show:

reduced immigration flows
alternate demographic makeup
projected population differences

IMPORTANT:
Present as:

educational simulation
historical modeling

NOT:

political persuasion
UI Style Guide
Visual Style
dark museum aesthetic
cinematic typography
glowing data overlays
smooth animations
Inspiration
Apple product demos
Smithsonian exhibits
Bloomberg visualizations
Minority Report interfaces
Data Model
Person
type Person = {
  id: string
  firstName: string
  lastName: string
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  parents?: string[]
}
Migration Event
type MigrationEvent = {
  year: number
  from: string
  to: string
  source?: string
}
Suggested File Structure
/src
  /components
    Timeline.tsx
    MigrationMap.tsx
    FamilyTree.tsx
    IntroScreen.tsx

  /pages
    index.tsx
    explore.tsx

  /services
    census.ts
    wikitree.ts
    ellisIsland.ts

  /data
    immigration-laws.json
API Service Layer
census.ts

Functions:

getPopulationByAncestry()
getForeignBornPopulation()
getStateDemographics()
wikitree.ts

Functions:

searchPerson()
getAncestors()
getDescendants()
Performance Requirements
MVP
support 1 user
local browser rendering
Production
support kiosk mode
60fps animations
touchscreen support
Privacy / Ethics
MUST
clearly distinguish:
historical records
inferred connections
simulations
NEVER
claim uncertain ancestry as fact
expose private living-person data
use facial recognition without explicit consent
Development Roadmap
Phase 1 — Prototype

Goal:
Working browser demo

Features:

surname search
map
timeline
WikiTree integration

Timeline:
1–2 weeks

Phase 2 — Museum Experience

Features:

fullscreen mode
cinematic transitions
touchscreen UI
demographic visualizations

Timeline:
2–4 weeks

Phase 3 — Public Installation

Features:

kiosk hardware
cloud backend
analytics
multi-user mode

Timeline:
1–3 months

Success Criteria

The app succeeds if users:

emotionally connect to immigration stories
understand historical demographic change
explore their own family origins
share the experience publicly
Immediate Next Steps
Build FIRST:
Search input
WikiTree ancestor fetch
Family tree display
Animated migration map
Census demographic chart

Do NOT start with:

facial recognition
massive datasets
AI agents
complicated backend infrastructure

Get the emotional experience working first.