# Fish Case Planner

## Overview
A web app for Whole Foods fishmongers to plan and build fish display case layouts. Used on both phone and desktop. Hosted on the home server (see docs/deploy.md).

**Current state:** Multi-file React (Vite) app. Layout edits, drops and case reading are pure modules under `src/case/` with Vitest tests. Published cases and the shared product catalog are stored by a small Node API (`api/`) in SQLite. Local saves and the cached catalog use localStorage.

Domain terms (Layout, Slot, Divider, Saved Case, Published Case, Color clash) are defined in `GLOSSARY.md`; use them in code and prose.

## The Physical Case Model

A fish display case is a rectangular surface viewed from above (top-down):
- **Width** (left to right): Measured in units. Default is **81 units**, maximum 208.
- **Depth** (front to back): Fixed at **12 units**. Front = customer glass side. Back = employee side.

Pans are placed side by side across the width. Each pan occupies some width and some depth.

### Pan Dimensions

**Width** (how much horizontal case space it takes): `3`, `6`, `8`, or `12` units.

**Depth split** (how the front-to-back space is divided):
- **Full** (12 units) - one product fills the entire depth
- **Half** (6 units) - two products stacked front-to-back (front half + back half)
- **Third** (4 units) - three products stacked front-to-back (front + mid + back)

**Depth split restrictions:**
- Only **3-wide** and **6-wide** pans can be split into halves or thirds
- **8-wide** and **12-wide** pans are always full depth

**Physical pan type:** Each pan is either **deep** or **shallow**. This is metadata for the person building the case (tells them which physical pan to grab). It does NOT affect the layout.
- 12-wide pans are always shallow in practice
- Most products use shallow pans, but some (like shrimp) always use deep

### Example Layout
```
← Width: 81 units total →

┌──6──┬──8──┬──6──┬───8───┬──8──┬──6──┬─3─┬──6──┬──6──┬──6──┬──6──┐
│     │     │     │       │     │     │   │     │  6  │     │     │  ← Front
│ OR  │ Cat │     │  Atl  │ Cod │ Sock│   │     ├─────┤     │ Atl │
│     │     │  6  │ Fillet│     │     │   │  6  │  3  │     │ Ctr │
│     │     │     │       │     │     │   │     ├─────┤     │     │  ← Back
│     │     │     │       │     │     │   │     │  6  │     │     │
└─────┴─────┴─────┴───────┴─────┴─────┴───┴─────┴─────┴─────┴─────┘
  Full  Full  Half   Full   Full  Full  F   Half  Third  Full  Full
```

## Product Data Model

```typescript
interface Product {
  id: string;
  name: string;           // Proper case enforced on save
  plu: string;            // Required in the editor, 5 digits
  color: "warm" | "cool" | "red";  // For the color separation rule
  cookType: "Raw" | "Cooked" | "Unassigned";
  fishType: "Finfish" | "Shellfish" | "Unassigned";
  maxPan: 3 | 6 | 8 | 12;
  minPan: 3 | 6 | 8 | 12;
  deepShallow: "deep" | "shallow";  // Physical pan preference
  demand: 1-10;           // Default demand level (affects auto-gen pan sizing)
  preferredZone: "" | "left" | "center-left" | "center" | "center-right" | "right";  // Auto-gen anchor
  preferredSplit: "" | "full" | "half" | "third";  // "" = auto
  preferredPosition: string;  // Free-text note, e.g. "2-3 pans from left"
  labels: string[];       // Keys from PRODUCT_LABELS (Fresh, MSC, Wild, ...)
}
```

`normalizeProduct` in `src/products/catalog.js` fills missing fields and maps old colors (orange -> warm, white/blue -> cool).

### Color Separation Rule
Adjacent pans should NOT have the same product color. This is purely visual: when two warm products (e.g., Atlantic Fillet and Atlantic Centers) sit next to each other in the physical case, they look like one blob and are hard to distinguish. Only **warm** and **red** clash; **cool** is exempt since many products are cool. Slots in neighboring pans touch when their front-to-back spans overlap. The rule is `colorsClash` / `colorClashes` in `src/case/queries.js`, used by the warnings, the slot picker and auto-generate.

### Default Products (starter data)
See `src/data/defaultProducts.js`. The live catalog comes from the API (`GET /api/products`), shared by everyone.

## Pan Data Model

```typescript
interface Pan {
  id: string;
  width: 3 | 6 | 8 | 12;
  depth: "full" | "half" | "third";
  panType: "deep" | "shallow";
  slots: Record<number, string | null>;  // slotIndex -> productId
  // full: { 0: productId }
  // half: { 0: frontProductId, 1: backProductId }
  // third: { 0: frontProductId, 1: midProductId, 2: backProductId }
}
```

## Case Data Model

```typescript
interface SavedCase {
  name: string;
  pans: Pan[];
  caseWidth: number;
  dividers: string[];  // "start" or the id of the pan each divider follows
  savedAt: string;  // ISO date
}
```

Every case that comes in (local save, `.fishcase` file, published case) goes through `readSavedCase` in `src/case/savedCase.js`, which checks it with `api/caseShape.js`, the same rules the API applies before storing one.

## Features & Behavior

### Two Modes of Building

**Manual Mode:**
1. Set case width (default 81)
2. Add pans one at a time: choose width, depth split, and deep/shallow
3. Assign products to pan slots by dragging from the product pool, tapping a slot to pick one, or tap-to-place
4. Drag pans to reorder (insert between, not swap)
5. Drag products between slots to swap them
6. Add dividers between pans to group them

**Auto Generate Mode:**
1. Optionally set case width
2. Select which products to include
3. Mark products as "on sale" (boosts pan size)
4. Generator assigns pan sizes based on product demand + sale status
5. Generator honors each product's preferred zone and preferred split
6. Generator attempts color separation (no clashing colors side by side)
7. Result can be manually adjusted after generation

### Auto-Generate Algorithm (`src/utils/autoGenerate.js`)
- Sort products by effective score: `demand + (onSale ? 4 : 0)`
- High score (≥10): gets maxPan size
- Medium-high (≥7): gets ~75th percentile of valid sizes
- Medium (≥4): gets median of valid sizes
- Low (<4): gets minPan size
- Products with a preferred split of half or third share 3- or 6-wide split pans
- If total exceeds case width, scale down lowest-priority items first
- Products with a preferred zone are placed in that fifth of the case first; the rest fill around them avoiding color clashes

### Layout Edits and Undo
All pan and slot changes go through `applyEdit` in `src/case/layout.js`, which returns a new Layout or the same object when the edit can't apply. `src/hooks/useLayout.js` wraps it with undo/redo (last 20 Layouts).

### Drag and Drop Rules
Mouse drag, touch drag and tap-to-place all describe a drop as (source, target) and get the edit from `dropToEdit` in `src/case/drop.js`.
- **Dragging a PAN** by its header: inserts it between other pans (blue indicator line shows insertion point). Does NOT swap.
- **Dragging a PRODUCT** from a slot: swaps it with the target slot's product (or moves it if target is empty, clearing source).
- **Dragging from the PRODUCT POOL** (sidebar): assigns the product to the target slot (overwrites whatever was there), or adds a new pan for it when dropped between pans.
- **Dragging a DIVIDER** (divider edit mode): places it in the gap after a pan.

### Product Pool (Sidebar)
- Always-visible list of all products
- Searchable by name or PLU
- Filterable by: color, cook type, fish type, deep/shallow
- Sortable by: name, demand, color, type
- Products are draggable directly into pan slots

### Product Catalog
- Shared across coworkers through the API; `src/hooks/useProductCatalog.js` is the only place that changes it
- Saves and deletes change the local list only after the server accepts them
- The last list is cached in localStorage so the app opens offline

### Confirmations & QOL
- **Removing a product from a slot** prompts confirmation ("Consider editing instead")
- **Deleting a product** prompts confirmation ("This removes it from all pans. Consider editing instead.")
- **Clearing all pans** prompts confirmation
- Product names are auto-converted to Proper Case on save
- Deep/shallow toggleable by clicking the badge on each pan header

### Save / Load / Share / Print
- Cases can be saved locally with a name and loaded back (replaces current layout)
- Cases can be exported to and imported from `.fishcase` files (`src/utils/caseFile.js`), which carry the products they use
- Cases can be published to the server under a 6-character short code so coworkers can load them
- Print view opens a clean top-down layout in a new window for printing
- Print shows: pan widths, deep/shallow indicator, product names, color coding
- Orientation: front (customer glass) at top, back at bottom

## Tech Stack
- **Frontend:** React 19 + Vite 6, inline styles with dark theme (`T` / `S` in `src/utils/constants.js`)
- **Backend:** Node 24 HTTP server in `api/` (routes listed at the top of `api/app.js`), SQLite via `node:sqlite`, database at `DB_PATH` (default `data/fish-case-planner.db`)
- **Hosting:** home server, nginx serves the build and forwards `/api`; pushing to `main` deploys (see docs/deploy.md)
- **Auth:** None. Publishing takes an optional author name.

## Development

- `npm run dev:api` (port 8787) and `npm run dev` (Vite) together. Vite proxies `/api` to the API but serves `.js` files under `/api` itself, because the app imports `api/caseShape.js` (see `vite.config.js`).
- To test against real data without touching `data/`, start the API with `DB_PATH` pointing at a copy of the database.
- Tests: `npm test` (Vitest, `src/**/*.test.js`), `npm run test:api` (Node's test runner for `api/`), `npx vite build`. CI runs all three plus `npm run check:server`.
- Many source files use CRLF line endings; keep them when editing.

## Future Considerations
- "On sale" as a weekly toggle rather than per-generation
- Export to image file (not just print)
- Case templates (common layouts that can be quickly loaded and tweaked)

## File Structure
```
api/
  app.js                 # HTTP routes under /api
  store.js               # SQLite storage for published cases and products
  caseShape.js           # Case validation shared with the app
  index.js               # Server entry point
  backup.js, import.js   # Server maintenance scripts
src/
  case/
    layout.js            # Layout edits (applyEdit), width checks
    queries.js           # Case queries and the Color clash rule
    drop.js              # Drop rule table for mouse, touch and tap-to-place
    savedCase.js         # Saved Case record and readSavedCase
  products/
    catalog.js           # Pure Product list operations and normalizeProduct
  components/
    CaseGrid.jsx         # Main case layout renderer
    PanColumn.jsx        # Individual pan with header + slots
    PanSlot.jsx          # Single slot within a pan
    ProductPool.jsx      # Sidebar product list with drag, filter, sort
    AddPanControls.jsx   # Pan creation toolbar
    ProductFormModal.jsx # Add/edit product form
    ProductManagerModal.jsx # Catalog browser and editor
    SlotPickerModal.jsx  # Pick a product for a tapped slot
    AutoGenModal.jsx     # Auto-generate configuration
    CasePreview.jsx      # Small read-only case drawing
    PrintView.jsx        # Print-friendly case view
    SavedCasesModal.jsx  # Local, file and published cases
    ConfirmDialog.jsx    # Reusable confirmation modal
  hooks/
    useLayout.js         # Layout state with undo/redo
    useProductCatalog.js # Shared Product catalog
    useCaseDrag.js       # Pan drag hover state
    useTouchDrag.js      # Touch drag and tap-to-place
    useLocalStorage.js   # localStorage persistence hook
    useIsMobile.js       # Phone / orientation detection
  lib/
    api.js               # Fetch wrappers for /api
  utils/
    autoGenerate.js      # Auto-generation algorithm
    caseFile.js          # .fishcase export/import
    dragData.js          # HTML5 drag payloads
    constants.js         # Pan sizes, colors, labels, theme
    helpers.js           # uid, toProperCase, depth utilities
  data/
    defaultProducts.js   # Starter product dataset
  App.jsx
  main.jsx
  index.css              # Global styles
```

## Design / Theme
- Dark theme (navy/charcoal backgrounds)
- Accent: sky blue (#38bdf8)
- Monospace font for data/labels (JetBrains Mono / SF Mono)
- Display font for headings/UI (DM Sans / Segoe UI)
- Color-coded product indicators matching the 3 product colors (warm orange, cool gray, red)
- Deep pans: blue badge. Shallow pans: amber/yellow badge.
- Responsive: works on phone screens and desktop
