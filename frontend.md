# GraphFit — Frontend Documentation

## Overview

GraphFit is a web app where users upload a **photo of a data table**, and the system extracts the numbers, fits a curve to the data, and displays the fitted graph along with its equation. The frontend is fully built; the backend (ML pipeline) is pending.

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
├── vite.config.js              # Vite config — React + Tailwind plugins
├── public/
│   └── vite.svg
└── src/
    ├── main.jsx                # App entry — renders <App /> into #root
    ├── index.css               # Tailwind import (@import "tailwindcss")
    ├── App.jsx                 # Router setup, wraps everything in AppProvider
    ├── context/
    │   └── AppContext.jsx      # Global state: fittingMode, uploadedFile, previewUrl
    ├── components/
    │   ├── Navbar.jsx          # Top nav bar with "GraphFit" brand link
    │   ├── Layout.jsx          # Page shell: Navbar + <Outlet /> + footer
    │   └── FileDropzone.jsx    # Drag-and-drop / click-to-browse image uploader
    └── pages/
        ├── HomePage.jsx        # Landing: hero, how-it-works, fitting mode cards
        ├── UploadPage.jsx      # Upload: mode badge, dropzone, preview, "Analyze" btn
        └── ResultsPage.jsx     # Results: uploaded image, fitted graph placeholder,
                                #   equation card, extracted data table, "Start Over"
```

## Routes

| Path       | Component      | Purpose                                           |
|------------|----------------|---------------------------------------------------|
| `/`        | `HomePage`     | Intro, how it works, select a fitting mode        |
| `/upload`  | `UploadPage`   | Upload a data table image, preview, click Analyze |
| `/results` | `ResultsPage`  | Show extracted data, equation, fitted graph area  |

## User Flow

```
Home (/)
  └─ User picks a fitting mode (card click)
       └─ Upload (/upload)
            └─ User drops/selects a data table image
                 └─ Click "Analyze Graph"
                      └─ Results (/results)
                           └─ Shows: uploaded image | fitted graph (placeholder)
                                     equation | data table
                           └─ "Start Over" → back to Home
```

## Fitting Modes (defined in HomePage.jsx)

| ID              | Label                      | Description                                              |
|-----------------|----------------------------|----------------------------------------------------------|
| `straight-line` | Straight Line              | Fit y = mx + c (least-squares linear regression)         |
| `cmc`           | Physical Exp. 1 — CMC      | Concentration vs. surface tension; find Critical Micelle Concentration via two-segment linear regression breakpoint |

## Global State (AppContext)

```
fittingMode   : string | null    — "straight-line" or "cmc"
uploadedFile  : File   | null    — the image File object from the user
previewUrl    : string | null    — object URL for the image preview

selectMode(id)   — sets fittingMode
setFile(file)    — sets uploadedFile + generates previewUrl
reset()          — clears all three values
```

## What the Backend Needs to Provide

When the backend is built, it needs **one API endpoint** that the frontend will call:

### `POST /api/analyze`

**Request** (multipart/form-data):
| Field  | Type   | Description                              |
|--------|--------|------------------------------------------|
| `image`| File   | The uploaded data table image             |
| `mode` | string | `"straight-line"` or `"cmc"`             |

**Expected Response** (JSON):
```json
{
  "equation": "y = 2.34x + 1.07",
  "description": "Fitted a straight line ...",
  "points": [[1, 3.4], [2, 5.7], [3, 8.1]],
  "graphImageUrl": "/api/graph/abc123.png"   // or base64 data URL
}
```

### Frontend integration points to update:

1. **`UploadPage.jsx` → `handleAnalyze()`** — currently just does `navigate("/results")`. Replace with an API call that sends the image + mode, stores the response, then navigates.
2. **`ResultsPage.jsx` → `MOCK_RESULTS`** — currently hardcoded mock data. Replace with the actual API response stored in context/state.
3. **`AppContext.jsx`** — add a `results` state field to store the backend response.

## Running

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
npm run build      # → production build in dist/
```
