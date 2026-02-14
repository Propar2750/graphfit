# claude.md — AI Assistant Context & Instructions

## Project: GraphFit

A website where users upload a photo of a **data table**, and the system uses ML to extract the data, fit a curve, and display the graph + equation.

---

## Current State

- **Frontend**: COMPLETE (React 19 + Vite 6 + Tailwind CSS v4 + react-router-dom v7)
- **Backend**: NOT STARTED

## Repo Layout

```
graph_figure_out/
├── product_description.md     # Original product brief
├── frontend.md                # Detailed frontend documentation
├── claude.md                  # This file — AI context
└── frontend/                  # React app (Vite)
    ├── src/
    │   ├── App.jsx            # Router: / , /upload , /results
    │   ├── context/AppContext.jsx  # State: fittingMode, uploadedFile, previewUrl
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Layout.jsx
    │   │   └── FileDropzone.jsx
    │   └── pages/
    │       ├── HomePage.jsx       # Mode selection: "straight-line" or "cmc"
    │       ├── UploadPage.jsx     # Image upload + "Analyze" button (stubbed)
    │       └── ResultsPage.jsx    # Displays results (currently MOCK_RESULTS)
    └── package.json
```

## Key Decisions Already Made

1. **User uploads a DATA TABLE image** (not a graph). The backend must OCR/extract numbers from a table photo.
2. **Two fitting modes exist**:
   - `"straight-line"` → linear regression (y = mx + c)
   - `"cmc"` → concentration vs surface tension → find CMC via two-segment regression breakpoint
3. **Frontend uses React Context** (not Redux). State is minimal: `fittingMode`, `uploadedFile`, `previewUrl`.
4. **Results page shows**: uploaded table image, fitted graph area (placeholder), equation, extracted data table.
5. **Backend API contract** is defined in frontend.md — `POST /api/analyze` accepting multipart form with `image` + `mode`, returning JSON with `equation`, `description`, `points`, `graphImageUrl`.

## When Building the Backend

### Must-do Integration Steps

1. **Add a `results` field to `AppContext.jsx`** to store the API response.
2. **Replace `handleAnalyze()` in `UploadPage.jsx`** — swap `navigate("/results")` with:
   ```js
   const formData = new FormData();
   formData.append("image", uploadedFile);
   formData.append("mode", fittingMode);
   const res = await fetch("/api/analyze", { method: "POST", body: formData });
   const data = await res.json();
   setResults(data);
   navigate("/results");
   ```
3. **Replace `MOCK_RESULTS` in `ResultsPage.jsx`** with the real `results` from context.
4. **Display the real fitted graph image** — replace the placeholder div with an `<img>` using `graphImageUrl` from the API response.
5. **Add a Vite proxy** in `vite.config.js` for local dev:
   ```js
   server: { proxy: { "/api": "http://localhost:8000" } }
   ```

### Backend Pipeline (Suggested)

```
Image upload → OCR / Table extraction → Parsed (x, y) data
  → Curve fitting (mode-dependent) → Equation + parameters
  → Plot generation (matplotlib / plotly) → Graph image
  → Return JSON response
```

### Suggested Backend Stack

- Python (Flask or FastAPI)
- OCR: Tesseract / PaddleOCR / Google Vision API
- Fitting: numpy / scipy (curve_fit, linregress)
- Plotting: matplotlib (save to buffer → base64 or file URL)

## Style & Conventions

- **Frontend**: JSX, functional components, Tailwind utility classes, no semicolons in imports
- **Naming**: camelCase for JS, kebab-case for fitting mode IDs (`"straight-line"`, `"cmc"`)
- **File structure**: pages in `src/pages/`, shared UI in `src/components/`, state in `src/context/`

## Commands

```bash
# Frontend
cd frontend && npm run dev          # Dev server at localhost:5173
cd frontend && npm run build        # Production build

# Backend (future)
cd backend && pip install -r requirements.txt
cd backend && uvicorn main:app --reload   # or flask run
```
