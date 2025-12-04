# Horror Mode Implementation Context

## Project Overview

**Goal**: Create a complete Halloween-themed UI skin for StudyForge as a separate React application.

**Location**: `quiz-flashcard-app/frontend-horror/`

**Plan File**: `C:\Users\22317\.claude\plans\composed-crunching-gem.md`

---

## Current Phase: Phase 2 - Core Components & Assets

### Status: READY TO START

### Phase 1 Checklist: COMPLETE
- [x] Create `frontend-horror/` folder structure
- [x] Initialize with Vite React TypeScript
- [x] Install dependencies: tailwind, react-router-dom, lucide-react, axios
- [x] Configure tailwind.config.js with horror color palette
- [x] Copy shared files from `frontend/`: api.ts, AuthContext.tsx, ErrorContext.tsx
- [x] Set up basic App.tsx with routing
- [x] Create AudioContext for sound management
- [x] Test that dev server runs (http://localhost:3001)

### Phase 2 Checklist: PENDING
- [ ] Create all SVG assets (ghost, skull, cauldron, gravestone, bat, etc.)
- [ ] Create BoneFrame component
- [ ] Create ParchmentCard component
- [ ] Create GravestoneButton component
- [ ] Create CauldronLoader component
- [ ] Create GhostIcon component
- [ ] Create SpiderwebOverlay component
- [ ] Create AudioControls component
- [ ] Add horror.css with all animations

---

## Implementation Phases Summary

| Phase | Description | Status | Files Created |
|-------|-------------|--------|---------------|
| 1 | Project Setup | ✅ COMPLETE | 16 files |
| 2 | Core Components & Assets | ⏳ NEXT | - |
| 3 | Landing Page | ⬜ Pending | - |
| 4 | Layout & Navigation | ⬜ Pending | - |
| 5 | Dashboard Pages | ⬜ Pending | - |
| 6 | Quiz Flow | ⬜ Pending | - |
| 7 | Study Tools | ⬜ Pending | - |
| 8 | Audio & Polish | ⬜ Pending | - |
| 9 | Deployment | ⬜ Pending | - |

---

## User Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| SVG Assets | Use from halloween zip (Freepik) |
| Sound Effects | YES - with toggle |
| Page Strategy | Separate folder (`frontend-horror/`) |
| Animation Level | Medium (hover, loaders, no parallax) |
| Deployment | Separate S3 bucket |

---

## Color Palette

```javascript
horror: {
  bg: {
    primary: '#1A1A1A',    // Main dark background
    secondary: '#2E2E2E',  // Cards/panels
    tertiary: '#3D3D3D',   // Hover states
  },
  glow: {
    green: '#00FF00',      // Cauldron/magic glow
    orange: '#FFA500',     // Fire/pumpkin
    purple: '#8B00FF',     // Crystal ball glow
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A9A9A9',
    parchment: '#F5E6C8',  // Cream/tan for parchment
  },
  bone: '#E8DCC4',
  blood: '#8B0000',
  moss: '#556B2F',
}
```

---

## Reference Images

### Main Design (`frontend idea.jpg`):
1. **Home Page** - Haunted castle, "STUDY FORGE" dripping text, cobwebs, bats, full moon
2. **Dashboard** - Dark header, gravestone category icons, parchment stats
3. **Quiz Settings** - Stone dungeon walls, wall torches, bubbling cauldron
4. **Quiz Question** - Bone frame, gravestone answer options A/B/C/D
5. **Analytics** - Ghost stat cards holding parchment signs
6. **Features** - Spiderweb background, coffin icons, potion bottles

### Additional Pages (`frontend idea extra.jpg`):
1. **My Library** - Wooden bookshelf with glowing spellbooks
2. **Profile & Settings** - Gravestone avatar frame, skeleton hands
3. **Community** - Haunted village, wooden bulletin board
4. **AI Chat** - Crystal ball for responses, spell book input

---

## Files to Create (Phase 1)

```
frontend-horror/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── index.html
├── public/
│   └── audio/           (placeholder for Phase 8)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── styles/
    │   ├── index.css
    │   └── horror.css
    ├── contexts/
    │   ├── AuthContext.tsx    (copy from frontend)
    │   ├── ErrorContext.tsx   (copy from frontend)
    │   └── AudioContext.tsx   (new)
    └── services/
        └── api.ts             (copy from frontend)
```

---

## Session Log

### 2025-12-04 - Session Start

**Completed:**
- Created comprehensive plan in `composed-crunching-gem.md`
- Analyzed reference images for design elements
- Confirmed user decisions (separate folder, sound effects, medium animations)
- Updated session-context.md with Horror Mode section
- Created this dedicated context file

### 2025-12-04 - Phase 1 Complete

**Files Created:**
```
frontend-horror/
├── package.json                    # Dependencies configured
├── vite.config.ts                  # Vite config (port 3001)
├── tailwind.config.js              # Horror color palette + animations
├── postcss.config.js               # PostCSS for Tailwind
├── tsconfig.json                   # TypeScript config
├── tsconfig.node.json              # Node TypeScript config
├── index.html                      # HTML entry point
├── .env                            # Environment variables
├── public/audio/                   # Audio folder (placeholder)
└── src/
    ├── main.tsx                    # React entry
    ├── App.tsx                     # Routing with providers
    ├── vite-env.d.ts               # Vite types
    ├── styles/
    │   └── index.css               # Horror CSS utilities + animations
    ├── types/
    │   └── index.ts                # TypeScript types (copied)
    ├── services/
    │   └── api.ts                  # API client (copied)
    ├── components/
    │   └── Toast.tsx               # Toast notifications (horror-styled)
    ├── contexts/
    │   ├── AuthContext.tsx         # Authentication (copied)
    │   ├── ErrorContext.tsx        # Error handling (copied)
    │   └── AudioContext.tsx        # NEW: Sound/music management
    └── pages/
        ├── LandingPage.tsx         # Basic horror landing
        ├── LoginPage.tsx           # Basic horror login
        ├── Home.tsx                # Basic horror dashboard
        └── NotFoundPage.tsx        # 404 page
```

**Dev Server Running:**
- URL: http://localhost:3001
- Status: Running successfully

**Next:**
- Begin Phase 2: Core Components & Assets

---

## Blockers

None currently.

---

## Notes

- Existing `frontend/` folder is PRODUCTION - DO NOT MODIFY
- Both frontends share the same backend API (`api.studyforge.co`)
- Horror mode will be deployed to separate URL (`horror.studyforge.co`)
- Main frontend runs on port 3000, horror frontend on port 3001
