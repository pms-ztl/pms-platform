# UI Invariants

Hard rules enforced by shared components, CI guardrails, and automated tests. These prevent blank-space defects, oversized empty states, and dead layout traps from being introduced.

---

## 1. Layout Primitives

### SafeGrid (`components/ui/SafeGrid.tsx`)
Auto-fit grid that **never creates empty columns** when there are fewer items than columns.

```tsx
import { SafeGrid } from '@/components/ui';

<SafeGrid minWidth={320} gap="gap-4">
  <Card />
  <Card />
  {/* 2 items fill full width — no empty 3rd column */}
</SafeGrid>
```

**Rule:** Use SafeGrid for any dynamic card collection (mentor cards, plan cards, etc.). Do NOT use `grid-cols-3` on variable-count collections.

### SafePanel (`components/ui/SafePanel.tsx`)
Content-driven card wrapper. No fixed heights. Conditional right slot.

```tsx
import { SafePanel } from '@/components/ui';

<SafePanel
  density="compact"
  rightSlot={hasData ? <Sparkline /> : undefined}
  header={<h3>Title</h3>}
>
  <p>Content</p>
</SafePanel>
```

**Rule:** No `justify-between` with empty right slots. SafePanel only allocates right space when `rightSlot` is provided.

### MasterDetail (`components/ui/MasterDetail.tsx`)
List + detail layout with **strict empty-state rules**.

```tsx
import { MasterDetail } from '@/components/ui';

<MasterDetail
  items={items}
  selectedItem={selected}
  renderList={(items) => <List items={items} />}
  renderDetail={(item) => <Detail item={item} />}
  onClearSelection={() => setSelected(null)}
  detailTitle="Details"
/>
```

**Rules:**
- Nothing selected → list spans **full width**, detail is **hidden** (not reserved)
- Selected on lg+ → side-by-side layout
- Selected on mobile → detail opens in a **modal drawer**
- `data-testid="ui-master-detail-detail"` on detail pane for automated testing

### EmptyState (`components/ui/EmptyState.tsx`)
Compact empty state with strict height caps.

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  icon={<MagnifyingGlassIcon />}
  title="No results"
  description="Try adjusting your filters"
  size="sm"  // "sm" | "md" | "full"
  actions={[{ label: 'Reset', onClick: reset }]}
/>
```

**Rules:**
- **NEVER** uses `min-h-screen`, `h-screen`, or viewport-based heights
- Default size "md" — compact padding
- "sm" for inline/card-level usage
- "full" for truly empty pages (still capped at reasonable height)

### ChartTooltip (`components/ui/ChartTooltip.tsx`)
Standard light-themed Recharts tooltip. Replaces dark default.

```tsx
import { ChartTooltip } from '@/components/ui';

<Tooltip content={<ChartTooltip unit="%" />} />
```

---

## 2. Banned Patterns

These patterns are detected by `scripts/ui-guardrails.mjs` and fail CI:

| Pattern | Why it's banned | Fix |
|---------|----------------|-----|
| `h-screen`, `min-h-screen` | Creates viewport-sized containers that are empty when content is sparse | Use `min-h-0` or remove |
| `h-[NNvh]`, `min-h-[NNvh]` (≥50vh) | Same as above | Use content-driven height |
| `h-[calc(100vh...)]` | Fixed-height trap | Content-driven layout |
| `py-16` or larger | Creates 128px+ vertical padding in empty states | Use `py-6` or `py-8` max |
| `py-20`, `py-24` | Even worse — 160-192px padding | Use `py-6` or `py-8` |
| `grid-cols-3` on collections | Creates empty columns when < 3 items | Use `SafeGrid` |

### Allowed Exceptions

Some patterns are legitimate. To suppress a guardrail violation, add a pragma comment **on the same line**:

```tsx
<div className="max-h-[90vh] overflow-y-auto"> {/* ui-allow: fixed-height — modal container */}
```

**Available pragmas:**
- `ui-allow: fixed-height` — for modals, drawers, chat layouts
- `ui-allow: rigid-grid` — for form grids, dashboard layouts (non-dynamic)
- `ui-allow: large-padding` — for hero sections, marketing pages

**Requirements:**
- Pragma must include a reason after the `—` dash
- Pragma must be on the same line as the violation
- Without a reason, CI still fails

---

## 3. CI Integration

### Static guardrails
```bash
npm run ui:guardrails
# Scans apps/web/src/pages/ for banned patterns
# Exit 0 = pass, Exit 1 = violations found
```

Add to your CI pipeline alongside `npm run build`:
```yaml
- run: npm run ui:guardrails
- run: npm run build
```

### Playwright layout audit
```bash
npm run ui:audit
# Runs Playwright tests at 1440, 1024, 375 widths
# Checks blank-space ratios, master-detail invariants, empty-state heights
```

Requires `@playwright/test` installed and dev server running.

---

## 4. data-testid Convention

Core components emit test IDs for automated auditing:

| Component | data-testid |
|-----------|-------------|
| StatCard | `ui-card` |
| SafePanel | `ui-panel` |
| SafeGrid | `ui-safe-grid` |
| EmptyState | `ui-empty-state` |
| MasterDetail detail pane | `ui-master-detail-detail` |

---

## 5. Checklist for New Pages

When creating a new page:

- [ ] Use `SafeGrid` for any card/item collection (never rigid `grid-cols-N` for dynamic data)
- [ ] Use `MasterDetail` for any list+detail pattern
- [ ] Use `EmptyState` (size="sm" or "md") for empty states — never custom large padding
- [ ] Use `ChartTooltip` for all Recharts `<Tooltip>` components
- [ ] No `h-screen`, `min-h-screen`, or `h-[calc(100vh...)]` on content sections
- [ ] No `py-16` or larger on any empty/loading state
- [ ] No `justify-between` on cards with optional right content — use `SafePanel` or conditional rendering
- [ ] Run `npm run ui:guardrails` before committing
- [ ] Verify at 1440, 1024, and 375 widths — no blank right columns, no giant empty areas
