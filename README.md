# Project: Education Centre Seat Allocation (Auth + Students + Friend Groups + Classrooms + Smart Allocation)

Stacks:
- Node/Express + MongoDB (Mongoose) backend
- JWT auth with bcryptjs, token persisted in `localStorage`
- CRUD for Students, Friend Groups, and Classrooms
- A fast allocation heuristic (constraint-aware round‑robin with penalties) to keep friends apart (not in same table, avoid adjacency when possible)
- Simple, clean UI with subtle animations (vanilla HTML/CSS/JS)

---

## Folder structure
```
seat-allocation-app/
├─ .env # contains MONGO_URI and JWT_SECRET
├─ package.json
├─ server.js
├─ /models
│ ├─ Teacher.js
│ ├─ Student.js
│ ├─ Group.js
│ └─ Class.js
├─ /middleware
│ └─ auth.js
├─ /routes
│ ├─ auth.js
│ ├─ students.js
│ ├─ groups.js
│ └─ classes.js
└─ /public
├─ index.html
├─ student.html
├─ class.html
├─ /css
│ ├─ index.css
│ ├─ student.css
│ └─ class.css
└─ /js
├─ logic.js # shared allocation logic (UMD: browser + Node)
├─ index.js
├─ student.js
└─ class.js
```