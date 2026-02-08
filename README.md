# Question Management Sheet

Hierarchical question tracker with full CRUD, cross-level drag-and-drop, persistent state, and undo/redo.

**Stack**: React 19 · TypeScript · Vite · Zustand · @dnd-kit · Tailwind CSS

## Quick Start

```bash
npm install && npm run dev
```

Data loads from [public API](https://node.codolio.com/api/question-tracker/v1/sheet/public/get-sheet-by-slug/striver-sde-sheet), falling back to sample data if unavailable.

---

## Architecture

### Normalized State (Zustand)

```
topicsById      Record<id, Topic>       ─┐
subTopicsById   Record<id, SubTopic>     ├─ Entity maps (O(1) lookup)
questionsById   Record<id, Question>    ─┘

topicOrder      string[]                ─┐
topic.subTopicIds    string[]            ├─ Order arrays (O(1) reorder)
subTopic.questionIds string[]           ─┘
```

**Why normalize?** Cross-level drag-and-drop moves items by updating ID arrays—no deep cloning of nested structures. Updates are O(1) and prevent accidental data duplication.

### Persistence

Zustand's `persist` middleware syncs state to localStorage on every mutation.

| Aspect | Implementation |
|--------|----------------|
| Key | `codolio-sheet` |
| Versioning | Schema version checked on load; invalid data triggers reset |
| Excluded | Undo history, hydration flags |

### Undo / Redo

Snapshot-based: full state copies stored before each mutation (max 20). Simpler and more reliable than command pattern at the cost of ~20× memory overhead—acceptable for this data size.

- **Shortcuts**: Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac)
- **UI**: Header buttons with disabled states

### Drag-and-Drop

Single `GlobalDndProvider` wraps the app, enabling:
- Reorder within container (topics, subtopics, questions)
- Cross-container moves (question → different subtopic, subtopic → different topic)

Uses `@dnd-kit` with `pointerWithin` + `rectIntersection` collision detection.

---

## Key Tradeoffs

| Decision | Cost | Benefit |
|----------|------|---------|
| Full snapshots for undo | Higher memory | No edge cases from partial diffs |
| localStorage (no backend) | 5MB limit, no multi-tab sync | Zero infra, instant persistence |
| Normalized state | More boilerplate | O(1) updates, clean cross-level DnD |
| Global DnD context | Shared state across tree | Cross-container drag without prop drilling |

---

## Project Layout

```
src/
├── store/useSheetStore.ts    # Zustand store (state + actions)
├── components/
│   ├── GlobalDndProvider.tsx # Unified DnD context
│   └── ui/                   # Reusable primitives
├── hooks/
│   ├── useDragSensors.ts
│   └── useKeyboardShortcuts.ts
└── types/                    # TypeScript definitions
```
