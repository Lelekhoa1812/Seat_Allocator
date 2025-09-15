# Seat Allocator

A simple classroom seat allocation tool for teachers. Manage students and friend groups, define tables, and generate fair seat placements in one click.

[Live Demo](https://student-allocator.vercel.app)

## Core features
- Authentication: email + password (JWT).
- Students: quick add/edit with optional external ID.
- Friend groups: keep selected students together as a group.
- Classrooms: create tables (rows/cols, 1–3 seats each), drag to reorder.
- One‑click allocation: assigns students to available seats with sensible priorities.
- Clean dark UI with subtle animations.

## Allocation algorithm (simple, fast, predictable)
1. Sort tables by grid position (row, then col). Initialize each with an empty `assigned` list.
2. Define a picker that always returns the table with the most remaining seats; ties break by row/col.
3. Place grouped students first (by provided friend groups), one by one, using the picker.
4. Place all remaining students using the same picker.
5. Return the final table list with `assigned` student IDs per seat index.

Notes
- The algorithm is greedy: favors balancing seat usage and keeps output stable across runs for the same inputs.
- If students exceed total seats, it errors early (no partial allocations).

## Tech
- API: Next.js API routes (MongoDB via Mongoose, JWT auth, bcryptjs).
- UI: static pages (HTML/CSS/JS) served by Next during transition to React.

## Run locally
1. Create `web/.env.local`:
   - `MONGO_URI=...`
   - `JWT_SECRET=...`
2. Install and run:
   - `cd web && npm install`
   - `npm run dev`
3. Open `http://localhost:3000`.


## Allocation & sorting
- Table order: sort by `row`, then `col` for stable traversal.
- Seat picker: choose the table with the most remaining seats; tie‑break by row/col.
- Placement order: place group members first (one by one), then remaining students, always using the same picker.
- Determinism: fixed sorts + tie‑breaks ⇒ same inputs produce the same layout.
- Complexity: O(S·T) for S students and T tables; fast for classroom sizes.

## Alternatives
- Strict round‑robin by table order: guarantees even distribution, weaker at avoiding local congestion late in the process.
- Weighted tables: bias certain rows/cols (e.g., front rows) by adding a weight to “remaining seats.”
- Separation constraints: add soft penalties (e.g., avoid placing same-group students on same table) by skipping candidate tables if any assigned member already sits there.
- Randomized tie-breaking: introduces variety at the cost of determinism.
