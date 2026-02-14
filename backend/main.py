import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from routes.extract import router as extract_router
from routes.fit import router as fit_router

load_dotenv()

app = FastAPI(title="GraphFit API", version="1.0.0")

# CORS — allow localhost in dev; in production the frontend is served from the same origin
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────────────
app.include_router(extract_router, prefix="/api")
app.include_router(fit_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Serve built frontend in production ───────────────────────────────
# The build script places the Vite build output in  backend/static/
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.is_dir():
    # Serve /assets (JS, CSS, images produced by Vite)
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    # Serve other static files at root (e.g. vite.svg, favicon)
    @app.get("/vite.svg")
    async def vite_svg():
        return FileResponse(STATIC_DIR / "vite.svg")

    # Serve static files (favicon, etc.) at the root level
    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(STATIC_DIR / "index.html")

    # SPA fallback: serve index.html for all non-API GET routes
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Don't intercept /api or /docs or /openapi.json
        if full_path.startswith("api") or full_path in ("docs", "redoc", "openapi.json"):
            from starlette.exceptions import HTTPException
            raise HTTPException(status_code=404)
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
