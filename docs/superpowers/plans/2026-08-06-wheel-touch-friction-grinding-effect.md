# Wheel Touch Friction & Grinding Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive friction slowdown and glowing spark grinding particle effects when users touch or hold down on spinning wheels in `CosmicWheelModal.jsx` and `wheel.js`.

**Architecture:**
1. **Particle Spark Engine**: Render spark lines, friction dust, and glowing heat rings at pointer contact coordinates $(gx, gy)$.
2. **Velocity Friction Physics**: Damping angular velocity when pointer is held down during spinning to slow down the wheel physically.
3. **Multi-Touch & Mouse Listeners**: Attach pointer events to `CosmicWheelModal.jsx` and `wheel.js`.

**Architecture Diagram:**

```mermaid
graph TD
    A[User Touch / Click on Spinning Canvas] --> B{Is Wheel Spinning?}
    B -->|Yes| C[Set isGrinding = true & Record (gx, gy)]
    B -->|No| D[Normal Click Handling]
    
    C --> E[Spawn 6 Spark Particles per Frame at gx, gy]
    C --> F[Apply Velocity Friction Damping: omega *= 0.94]
    
    E --> G[Draw Sparks Overlay on Canvas]
    F --> H[Update Wheel Rotation]
```

**Tech Stack:** JavaScript, HTML5 Canvas 2D API, React, Pointer Events API.

## Global Constraints

- **No Break in Winner Resolution**: Physical slowdown must gracefully taper off so the wheel always stops smoothly on a valid segment winner.
- **High Performance 60FPS**: Spark arrays capped at max 40 active particles to maintain 60FPS on low-tier mobile browsers.
- **Cross-Platform**: Support both Mouse and Touch events (`PointerEvent` / `TouchEvent`).

---

### Task 1: Add Interactive Spark Grinding & Friction Slowdown to `CosmicWheelModal.jsx`

**Files:**
- Modify: `[frontend/src/games/LingoParty/components/CosmicWheelModal.jsx](file:///home/berkay/Desktop/who/frontend/src/games/LingoParty/components/CosmicWheelModal.jsx)`
- Modify: `[frontend/src/games/LingoParty/components/CosmicWheelModal.module.css](file:///home/berkay/Desktop/who/frontend/src/games/LingoParty/components/CosmicWheelModal.module.css)`

- [ ] **Step 1: Add Spark Particle Array & Friction State in `CosmicWheelModal.jsx`**

Add `sparksRef` array and `isGrindingRef` state to track touch position $(gx, gy)$ and render friction sparks in the main `drawWheel` canvas render loop.

- [ ] **Step 2: Add Pointer Event Handlers on Wheel Canvas & Container**

Add `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave` event handlers updating touch position and spawning friction sparks.

- [ ] **Step 3: Integrate Velocity Slowdown into Physics Loop**

In `animateSpin`, when `isGrindingRef.current` is true, apply extra deceleration damping multiplier so holding down slows down the wheel smoothly.

- [ ] **Step 4: Verify Frontend Build**

Run: `npm --prefix frontend run build`  
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add frontend/src/games/LingoParty/components/CosmicWheelModal.jsx frontend/src/games/LingoParty/components/CosmicWheelModal.module.css
git commit -m "feat(wheel): add touch friction grinding sparks and physical slowdown to CosmicWheelModal"
```

---

### Task 2: Add Touch Friction Grinding & Slowdown to Standalone `wheel.js`

**Files:**
- Modify: `[wheel.js](file:///home/berkay/Desktop/who/wheel.js)`

- [ ] **Step 1: Add Spark Engine & Touch Listeners to `wheel.js`**

Add spark particle loop and pointer/touch event listeners on `canvas` (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`).

- [ ] **Step 2: Apply Friction Deceleration during `animateSpin` in `wheel.js`**

Damp velocity `omega *= 0.94` when user holds down during spin.

- [ ] **Step 3: Run Full Unit Test Suite**

Run: `npm test`  
Expected: PASS (99+ tests passing)

- [ ] **Step 4: Commit Task 2**

```bash
git add wheel.js
git commit -m "feat(wheel): add touch friction grinding effect and physical slowdown to standalone wheel.js"
```

---

## Plan Completion & Execution Handoff

Plan complete. Ready to execute!
