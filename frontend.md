# GraphFit — Frontend Documentation

> **Master reference:** See `claude.md` for project overview and links to all docs.

## Tech Stack

| Layer       | Tool                         |
|-------------|------------------------------|
| Framework   | React 19 (Vite 6)           |
| Routing     | react-router-dom v7          |
| Styling     | Tailwind CSS v4 (Vite plugin)|
| State       | React Context API            |

## Project Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js              # Vite config — React + Tailwind plugins + /api proxy
├── public/
└── src/
    ├── main.jsx                # App entry — renders <App /> into #root
    ├── index.css               # Tailwind import (@import "tailwindcss")
    ├── App.jsx                 # Router: / → /upload → /review → /results
    ├── context/
    │   └── AppContext.jsx      # Global state for entire flow + waves dual-table state
    ├── components/
    │   ├── Navbar.jsx          # Top nav bar with "GraphFit" brand link
    │   ├── Layout.jsx          # Page shell: Navbar + <Outlet /> + footer
    │   └── FileDropzone.jsx    # Drag-and-drop / click-to-browse image uploader
    └── pages/
        ├── HomePage.jsx        # Landing: hero, how-it-works, 11 fitting mode cards
        ├── UploadPage.jsx      # Image upload + OCR extract trigger
        ├── ReviewPage.jsx      # Editable data table before fitting (most complex page)
        └── ResultsPage.jsx     # Graph image + equation + data points display
```

## Routes & User Flow

| Path       | Component      | Purpose                                           |
|------------|----------------|---------------------------------------------------|
| `/`        | `HomePage`     | Intro, how it works, select a fitting mode        |
| `/upload`  | `UploadPage`   | Upload data table image(s), trigger OCR           |
| `/review`  | `ReviewPage`   | Edit extracted data before fitting                |
| `/results` | `ResultsPage`  | Show fitted graph, equation, data points          |

```
Home → select mode → Upload → drop image(s) → Extract Data
  → Review → edit table → Fit Curve → Results → graph + equation
  → "Start Over" → Home
```

## Global State (AppContext.jsx)

### Standard mode state
| Field | Type | Purpose |
|-------|------|---------|
| `fittingMode` | `string \| null` | Selected mode ID (e.g. `"straight-line"`) |
| `uploadedFiles` | `File[]` | Image files from the user |
| `previewUrls` | `string[]` | Blob URLs for image previews |
| `extractedData` | `{ columns, rows }` | OCR output after `/api/extract` |
| `results` | `object` | Fit results from `/api/fit` |

### Waves mode dual-table state
| Field | Type | Purpose |
|-------|------|---------|
| `wavesRopeFile` / `wavesRopePreview` | `File` / `string` | Rope wave table image |
| `wavesSoundFile` / `wavesSoundPreview` | `File` / `string` | Sound wave table image |
| `wavesRopeData` / `wavesSoundData` | `{ columns, rows }` | OCR output for each table |

### Key methods
- `selectMode(id)` — sets fitting mode, navigates to upload
- `addFiles(files)` / `removeFile(index)` — manage uploaded images
- `setWavesRopeFileWithPreview(file)` / `setWavesSoundFileWithPreview(file)` — waves mode
- `reset()` — clears all state, returns to home

## Fitting Modes (11 total — defined in HomePage.jsx)

| ID | Title |
|----|-------|
| `straight-line` | Straight Line |
| `cmc` | Chemistry — CMC |
| `photoelectric-1-1` | Exp 1.1 — Photoelectric (V-I) |
| `photoelectric-1-2` | Exp 1.2 — Photoelectric (h) |
| `photoelectric-1-3` | Exp 1.3 — Photoelectric (Intensity) |
| `single-slit` | Exp 2 — Single Slit Diffraction |
| `newtons-rings` | Exp 3 — Newton's Rings |
| `pohls-damped` | Exp 4.1 — Pohl's Pendulum (Damped) |
| `pohls-forced` | Exp 4.2 — Pohl's Pendulum (Forced) |
| `polarization` | Exp 6 — Optical Rotation |
| `waves` | Exp 7 — Transverse & Longitudinal Waves |

Mode entries are objects with `{ id, title, description, icon }` in the `FITTING_MODES` array.

## Page-Specific Details

### UploadPage.jsx
- **Standard modes**: Multi-file dropzone, sends each to `POST /api/extract` with the mode
- **Waves mode**: Two separate single-file dropzones (rope + sound), sends to `/api/extract` with modes `waves-rope` and `waves-sound`
- Extract button calls OCR, stores result in `extractedData` (or waves state), navigates to `/review`

### ReviewPage.jsx (most complex page)
- **Standard modes**: Single editable table — inline cell editing, add/delete rows
- **Waves mode**: Two side-by-side editable tables (rope with blue theme, sound with violet theme)
- Column headers are editable
- "Fit Curve" button sends data to `/api/fit` (standard) or `/api/fit-waves` (waves)
- Stores result in `results`, navigates to `/results`

### ResultsPage.jsx
- **Standard modes**: Single graph image (`results.graphImage` as base64), equation card, data points table
- **Waves mode**: Two graph cards side-by-side (`results.ropeGraphImage`, `results.soundGraphImage`)
- Equation display uses `whitespace-pre-line` for multi-line equations
- Source image previews shown alongside

## Running

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173 (proxies /api → localhost:8000)
npm run build      # → production build in dist/
```
