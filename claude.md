# Fish Case Planner

## Overview
A web app for Whole Foods fishmongers to plan and build fish display case layouts. Used on both phone and desktop. Hosted on Vercel.

**Current state:** Working React prototype (single-file JSX) with localStorage. Needs to be refactored into a proper multi-file React project and eventually connected to a Spring Boot + PostgreSQL backend.

## The Physical Case Model

A fish display case is a rectangular surface viewed from above (top-down):
- **Width** (left to right): Measured in units. Default is **81 units**.
- **Depth** (front to back): Fixed at **12 units**. Front = customer glass side. Back = employee side.

Pans are placed side by side across the width. Each pan occupies some width and some depth.

### Pan Dimensions

**Width** (how much horizontal case space it takes): `3`, `6`, `8`, or `12` units.

**Depth split** (how the front-to-back space is divided):
- **Full** (12 units) — one product fills the entire depth
- **Half** (6 units) — two products stacked front-to-back (front half + back half)
- **Third** (4 units) — three products stacked front-to-back (front + mid + back)

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
  plu: string;            // Optional, 5 digits
  color: "red" | "white" | "orange" | "blue";  // For color separation rules
  cookType: "Raw" | "Cooked" | "Unassigned";
  fishType: "Finfish" | "Shellfish" | "Unassigned";
  maxPan: 3 | 6 | 8 | 12;
  minPan: 3 | 6 | 8 | 12;
  deepShallow: "deep" | "shallow";  // Physical pan preference
  demand: 1-10;           // Default demand level (affects auto-gen pan sizing)
}
```

### Color Separation Rule
Adjacent pans should NOT have the same product color. This is purely visual — when two orange products (e.g., Atlantic Fillet and Atlantic Centers) sit next to each other in the physical case, they look like one blob and are hard to distinguish. The app shows warnings when this rule is violated. White is exempt from this rule since many products are white.

### Default Products (starter data)
| Name | PLU | Color | Cook | Type | Min | Max | Depth | Demand |
|------|-----|-------|------|------|-----|-----|-------|--------|
| Atlantic Fillet | 12345 | orange | Raw | Finfish | 6 | 12 | shallow | 9 |
| Atlantic Centers | 12346 | orange | Raw | Finfish | 3 | 8 | shallow | 6 |
| King Salmon | 22001 | red | Raw | Finfish | 3 | 8 | shallow | 7 |
| Sockeye Salmon | 22002 | red | Raw | Finfish | 3 | 8 | shallow | 6 |
| Cod | 33001 | white | Raw | Finfish | 6 | 8 | shallow | 7 |
| Halibut | 33002 | white | Raw | Finfish | 3 | 6 | shallow | 5 |
| Catfish | 33003 | white | Raw | Finfish | 6 | 8 | shallow | 6 |
| Orange Roughy | 33004 | white | Raw | Finfish | 3 | 6 | shallow | 4 |
| Chilean Seabass | 44001 | white | Raw | Finfish | 3 | 6 | shallow | 5 |
| Whitefish | 44002 | white | Raw | Finfish | 3 | 6 | shallow | 3 |
| 26/30 Shrimp | 55001 | red | Raw | Shellfish | 3 | 6 | deep | 7 |
| Mahi Mahi | 66001 | white | Raw | Finfish | 3 | 8 | shallow | 5 |

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
  savedAt: string;  // ISO date
}
```

## Features & Behavior

### Two Modes of Building

**Manual Mode:**
1. Set case width (default 81)
2. Add pans one at a time: choose width, depth split, and deep/shallow
3. Assign products to pan slots by dragging from the product pool or searching
4. Drag pans to reorder (insert between, not swap)
5. Drag products between slots to swap them

**Auto Generate Mode:**
1. Optionally set case width
2. Select which products to include
3. Mark products as "on sale" (boosts pan size)
4. Generator assigns pan sizes based on product demand + sale status
5. Generator attempts color separation (no same-color adjacency)
6. Result can be manually adjusted after generation

### Auto-Generate Algorithm
- Sort products by effective score: `demand + (onSale ? 4 : 0)`
- High score (≥10): gets maxPan size
- Medium-high (≥7): gets ~75th percentile of valid sizes
- Medium (≥4): gets median of valid sizes
- Low (<4): gets minPan size
- If total exceeds case width, scale down lowest-priority items first
- Arrange with color separation: alternate colors, avoid same-color adjacency

### Drag and Drop Rules
- **Dragging a PAN** by its header: inserts it between other pans (blue indicator line shows insertion point). Does NOT swap.
- **Dragging a PRODUCT** from a slot: swaps it with the target slot's product (or moves it if target is empty, clearing source).
- **Dragging from the PRODUCT POOL** (sidebar): assigns the product to the target slot (overwrites whatever was there).

### Product Pool (Sidebar)
- Always-visible list of all products
- Searchable by name or PLU
- Filterable by: color, cook type, fish type, deep/shallow
- Sortable by: name, demand, color, type
- Products are draggable directly into pan slots

### Confirmations & QOL
- **Removing a product from a slot** prompts confirmation ("Consider editing instead")
- **Deleting a product** prompts confirmation ("This removes it from all pans. Consider editing instead.")
- **Clearing all pans** prompts confirmation
- Product names are auto-converted to Proper Case on save
- Deep/shallow toggleable by clicking the badge on each pan header

### Save / Load / Print
- Cases can be saved with a name
- Saved cases can be loaded back (replaces current layout)
- Print view opens a clean top-down layout in a new window for printing
- Print shows: pan widths, deep/shallow indicator, product names, color coding
- Orientation: front (customer glass) at top, back at bottom

## Tech Stack

### Current (Prototype)
- Single React JSX component
- localStorage for persistence
- Inline styles with dark theme
- Hosted on Vercel

### Target Architecture
- **Frontend:** React (Vite) on Vercel
- **Backend:** Spring Boot (Java)
- **Database:** PostgreSQL
- **Auth:** None for now. Possibly name-entry for tracking (no passwords).

## Future Considerations
- Mobile touch drag-and-drop (current HTML5 drag API doesn't work great on mobile)
- Backend API for products, cases, and shared access across coworkers
- "On sale" as a weekly toggle rather than per-generation
- Export to image file (not just print)
- Undo/redo for case edits
- Case templates (common layouts that can be quickly loaded and tweaked)

## File Structure (target)
```
src/
  components/
    CaseGrid.jsx         # Main case layout renderer
    PanColumn.jsx         # Individual pan with header + slots
    PanSlot.jsx           # Single slot within a pan
    ProductPool.jsx       # Sidebar product list with drag, filter, sort
    AddPanControls.jsx    # Pan creation toolbar
    ProductFormModal.jsx  # Add/edit product form
    AutoGenModal.jsx      # Auto-generate configuration
    PrintView.jsx         # Print-friendly case view
    SavedCasesModal.jsx   # Load/delete saved cases
    ConfirmDialog.jsx     # Reusable confirmation modal
  hooks/
    useLocalStorage.js    # localStorage persistence hook
    useCaseDrag.js        # Pan drag-and-drop logic
  utils/
    autoGenerate.js       # Auto-generation algorithm
    colorConflicts.js     # Adjacent color warning checker
    constants.js          # Pan sizes, colors, types, defaults
    helpers.js            # uid, toProperCase, depth utilities
  data/
    defaultProducts.js    # Starter product dataset
  App.jsx
  main.jsx
  index.css              # Global styles, CSS variables for theme
```

## Design / Theme
- Dark theme (navy/charcoal backgrounds)
- Accent: sky blue (#38bdf8)
- Monospace font for data/labels (JetBrains Mono / SF Mono)
- Display font for headings/UI (DM Sans / Segoe UI)
- Color-coded product indicators matching the 4 product colors
- Deep pans: blue badge. Shallow pans: amber/yellow badge.
- Responsive: works on phone screens and desktop