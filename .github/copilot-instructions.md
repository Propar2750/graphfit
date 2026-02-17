# GraphFit — Copilot Instructions

> **For deeper context, read `claude.md` (master index) → links to `frontend.md`, `backend.md`, `MENU_ITEM_SPEC.md`.**

## What This Project Is

GraphFit lets users upload a **photo of a data table** (not a graph), then OCRs the numbers, fits a curve, and displays the fitted graph + equation. It supports 11 physics/chemistry experiment modes. Deployed on Render via `render.yaml`.

## Architecture

```
Image Upload → POST /api/extract (OCR via Groq Vision) → Editable Table (Review)
  → POST /api/fit (curve fitting + matplotlib plot) → Base64 PNG graph + equation
```

- **Backend**: FastAPI (Python), served from `backend/`. Static frontend build served from `backend/static/`.
- **Frontend**: React 19 + Vite 6 + Tailwind CSS v4, in `frontend/`. Routes: `/` → `/upload` → `/review` → `/results`.
- **OCR**: Groq API with `meta-llama/llama-4-scout-17b-16e-instruct` vision model (`services/ocr.py`).
- **Fitting**: numpy/scipy least-squares in `services/fitting.py`. Each mode has a `fit_*()` function.
- **Plotting**: matplotlib generating base64 PNG in `services/plotting.py`. Each mode has its own plot branch.

## Adding a New Fitting Mode (Checklist)

Follow `MENU_ITEM_SPEC.md` for the full spec. The 5-file touch pattern:

1. `frontend/src/pages/HomePage.jsx` — add entry to `FITTING_MODES` array (`id`, `title`, `description`, `icon`)
2. `backend/services/ocr.py` — add `elif mode == "<id>":` with a `column_hint` string
3. `backend/services/fitting.py` — add `fit_<mode>()` or reuse `fit_straight_line()`. Must return `equation`, `description`, `r_squared`
4. `backend/routes/fit.py` — add `elif req.mode == "<id>":` dispatch
5. `backend/services/plotting.py` — add `elif mode == "<id>":` branch with axes labels, fit curve, annotation

**Special case — "waves" mode**: Uses a separate endpoint `/api/fit-waves` with dual tables (rope + sound), dual OCR calls (`waves-rope`, `waves-sound`), and dual graphs. Frontend handles this with dedicated state in `AppContext.jsx` and conditional rendering in Upload/Review/Results pages.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/extract` | POST | Multipart: `image` (file) + `mode` (string) → OCR'd table data |
| `/api/fit` | POST | JSON: `{mode, points, columns}` → fitted equation + base64 graph |
| `/api/fit-waves` | POST | JSON: `{rope_points, rope_columns, sound_points, sound_columns}` → dual graphs |
| `/api/health` | GET | Health check |

## Conventions

- **Mode IDs**: kebab-case (`"straight-line"`, `"photoelectric-1-1"`, `"waves"`)
- **Fitting functions**: `fit_<snake_case>()` in `services/fitting.py`
- **Frontend**: JSX, functional components, Tailwind utilities, React Context (no Redux)
- **State**: `AppContext.jsx` holds `fittingMode`, `uploadedFiles`, `extractedData`, `results`, plus waves-specific dual state
- **Multi-series modes** (3+ columns): listed in `MULTI_SERIES_MODES` set in `routes/fit.py`

## Commands

```bash
# Frontend dev
cd frontend && npm run dev            # localhost:5173, proxies /api → :8000

# Backend dev
cd backend && uvicorn main:app --reload  # localhost:8000

# Production build (what Render runs)
chmod +x build.sh && ./build.sh        # installs deps, builds frontend, copies to backend/static/
```

## Key Files

| File | Role |
|------|------|
| `backend/services/ocr.py` | Groq Vision OCR — mode-specific column hints |
| `backend/services/fitting.py` | All `fit_*()` functions — ~600 lines |
| `backend/services/plotting.py` | `generate_graph()` with per-mode plot branches — ~420 lines |
| `backend/routes/fit.py` | `/api/fit` and `/api/fit-waves` endpoints — mode dispatch |
| `frontend/src/context/AppContext.jsx` | Global React state for the entire flow |
| `frontend/src/pages/ReviewPage.jsx` | Editable data table before fitting — most complex frontend page |
| `MENU_ITEM_SPEC.md` | Canonical spec for adding new modes (with examples) |

## Environment

- `GROQ_API_KEY` required in `.env` (backend) or Render dashboard
- Python 3.11, Node 20
- No database — stateless request/response only
