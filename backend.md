# GraphFit — Backend Documentation

> **Master reference:** See `claude.md` for project overview and links to all docs.

## Tech Stack

| Layer    | Tool                                                |
|----------|-----------------------------------------------------|
| Framework| FastAPI (Python 3.11)                               |
| OCR      | Groq API — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Fitting  | numpy, scipy (least-squares, curve_fit)             |
| Plotting | matplotlib → base64 PNG                             |
| Server   | uvicorn (dev), gunicorn + uvicorn workers (prod)    |

## Project Structure

```
backend/
├── main.py                  # FastAPI app, CORS, static file serving, SPA fallback
├── requirements.txt         # Python deps (fastapi, groq, numpy, scipy, matplotlib, etc.)
├── test_cmc_methods.py      # Tests for CMC fitting
├── routes/
│   ├── extract.py           # POST /api/extract — receives image, returns OCR'd table
│   └── fit.py               # POST /api/fit — receives data, returns graph + equation
│                            # POST /api/fit-waves — waves-specific dual endpoint
├── services/
│   ├── ocr.py               # Groq Vision API — per-mode column hints (~200 lines)
│   ├── fitting.py           # All fit_*() functions (~600 lines)
│   └── plotting.py          # generate_graph() with per-mode branches (~420 lines)
└── static/                  # Built frontend (created by build.sh, gitignored)
```

## Request Flow

```
1. Image arrives at POST /api/extract (routes/extract.py)
   → Validates file type, reads bytes
   → Calls extract_table_from_image() in services/ocr.py
   → Returns { columns: [...], rows: [[...], ...] }

2. User reviews/edits data in the frontend ReviewPage

3. Confirmed data arrives at POST /api/fit (routes/fit.py)
   → Validates row widths (2 cols for standard, N cols for multi-series)
   → Dispatches to the correct fit_*() function in services/fitting.py
   → Passes fit_params to generate_graph() in services/plotting.py
   → Returns { equation, description, graphImage (base64), fitParams }
```

## Services Detail

### ocr.py — Groq Vision OCR

- Uses `Groq` client with `GROQ_API_KEY` from env
- `extract_table_from_image(image_bytes, mime_type, mode)` → `{ columns, rows }`
- Each mode has a `column_hint` string appended to the prompt, telling the vision model what columns to expect
- The prompt asks the model to return strict JSON: `{"columns": [...], "rows": [...]}`
- Sub-modes for waves: `waves-rope` and `waves-sound` have separate hints

### fitting.py — Curve Fitting Functions

Every `fit_*()` function takes `points: list[list[float]]` and returns a dict with at minimum:
- `equation` (str) — display string
- `description` (str) — explanation with R²
- `r_squared` (float) — goodness of fit

| Function | Line | Input | What it computes |
|----------|------|-------|-----------------|
| `fit_straight_line()` | 9 | `[[x, y], ...]` | Linear regression y = mx + c |
| `fit_cmc()` | 86 | `[[conc, tension], ...]` | Piecewise breakpoint for CMC |
| `fit_photoelectric_vi()` | 247 | `[[V, I, ...], ...]` | Multi-series V-I linear fits |
| `fit_photoelectric_h()` | 285 | `[[ν, V₀], ...]` | Planck's constant from V₀ vs ν |
| `fit_single_slit()` | 313 | `[[θ, I], ...]` | Sinc² diffraction fit |
| `fit_newtons_rings()` | 358 | `[[m, r], ...]` | Linear fit of r² vs m |
| `fit_pohls_damped()` | 387 | `[[t, θ, ...], ...]` | Exponential decay envelope |
| `fit_pohls_forced()` | 443 | `[[f, A, ...], ...]` | Resonance amplitude curve |
| `fit_polarization()` | 489 | `[[conc, rotation], ...]` | Linear specific rotation |
| `fit_waves_rope()` | 508 | `[[group, 1/ν, λ], ...]` | Per-group linear fits (3 tensions) |
| `fit_waves_sound()` | 568 | `[[freq, length_cm], ...]` | Speed of sound from λ vs 1/ν |

Multi-series modes (`photoelectric-1-1`, `photoelectric-1-3`, `pohls-damped`, `pohls-forced`) accept 3+ columns and group data by the first column or by multiple y-columns. These are listed in `MULTI_SERIES_MODES` in `routes/fit.py`.

### plotting.py — Graph Generation

- `generate_graph(points, fit_params, mode, columns)` → base64 PNG string
- Creates a matplotlib figure, branches by mode for custom axes labels, curve rendering, annotation
- Uses `SERIES_COLORS` and `SERIES_MARKERS` lists for multi-series consistency
- Returns `data:image/png;base64,...` string ready for `<img src=...>`

Each mode branch defines:
1. Axis labels with units
2. Scatter plot of data points
3. Fitted curve over `x_smooth` (linspace)
4. Annotation text box with equation, R², key values
5. Legend and optional special markers (CMC breakpoint, resonance peak, etc.)

## Routes Detail

### POST /api/extract (routes/extract.py)
- Input: multipart `image` (File) + `mode` (string)
- Validates image type and non-empty
- Calls `extract_table_from_image()`, returns `{ columns, rows }`

### POST /api/fit (routes/fit.py)
- Input: JSON `{ mode, points, columns }`
- Validates row widths (2 for standard, uniform N for multi-series)
- Dispatches to `fit_*()`, generates graph, returns full result

### POST /api/fit-waves (routes/fit.py)
- Input: JSON `{ rope_points, rope_columns, sound_points, sound_columns }`
- Calls `fit_waves_rope()` and `fit_waves_sound()` separately
- Generates two graphs independently
- Returns `{ ropeGraphImage, soundGraphImage, ropeFitParams, soundFitParams, equation, description }`

## main.py — App Setup

- CORS configured via `CORS_ORIGINS` env var (defaults to `localhost:5173`)
- Routes mounted at `/api` prefix
- In production: serves built frontend from `backend/static/`
- SPA fallback: all non-API GET routes return `index.html`

## Adding a New Mode (Backend Side)

1. **ocr.py**: Add `elif mode == "<id>":` with column hint
2. **fitting.py**: Add `fit_<mode>()` returning `equation`, `description`, `r_squared` + mode-specific params
3. **routes/fit.py**: Add `elif req.mode == "<id>":` dispatch + import
4. **plotting.py**: Add `elif mode == "<id>":` with axes labels, curve, annotation

See `MENU_ITEM_SPEC.md` for full details and examples.

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # → http://localhost:8000

# Production (what Render runs)
gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | Yes | Groq API key for vision OCR |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173`) |
