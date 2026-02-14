# Contributing to Mission Control

## 🎯 Workflow Rules (MANDATORY)

### Before ANY Work:
1. **Create a task** on [Mission Control](https://mission-control-backend-production-dc52.up.railway.app)
2. **Assign to an agent** (Goku, Vegeta, etc.)
3. **Work in internal repos first** — test here before public

### Commit Message Convention:
```
[#TASK_ID] Brief description

Example:
[#130] Add workflow docs to backend
```

### Repo Hierarchy:

| Repo | Purpose | Direct Push? |
|------|---------|--------------|
| `mission-control-backend` | Internal backend | ✅ Yes |
| `mission-control-frontend` | Internal frontend | ✅ Yes |
| `claw-control` (public) | OSS release | ❌ PR only after internal test |

### The Golden Rule:
```
Internal (mission-control-*) → Test → PR to Public (claw-control)
```

## 🚨 If You Skip the Workflow (Orphan Work Protocol):
1. STOP and create a task retroactively
2. Link it to your commit with a comment
3. Mark task as completed
4. Don't let it slide!

### Self-Check Before Any PR:
- "Is this task on the board?"
- "Did I spawn an agent or am I doing it myself?"
- "Does my commit have `[#TASK_ID]` in the message?"
- "Did I test in internal before touching public?"

---

## Development

```bash
# Install
npm install

# Run dev
npm run dev

# Build
npm run build
```
