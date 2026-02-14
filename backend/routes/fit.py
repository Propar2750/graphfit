"""
POST /api/fit — receives confirmed data points + mode, returns fitted equation + graph image.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.fitting import (
    fit_straight_line,
    fit_cmc,
    fit_photoelectric_vi,
    fit_photoelectric_h,
    fit_single_slit,
    fit_newtons_rings,
    fit_pohls_damped,
    fit_pohls_forced,
    fit_polarization,
    fit_waves,
)
from services.plotting import generate_graph

router = APIRouter()

# Modes that accept more than 2 columns per row (multi-series data)
MULTI_SERIES_MODES = {
    "photoelectric-1-1",
    "photoelectric-1-3",
    "pohls-damped",
    "pohls-forced",
}


class FitRequest(BaseModel):
    mode: str
    points: list[list[float]]
    columns: list[str] = []


@router.post("/fit")
async def fit(req: FitRequest):
    if len(req.points) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 data points.")

    # Validate row widths — strict 2-value check only for non-multi-series modes
    if req.mode not in MULTI_SERIES_MODES:
        for i, pt in enumerate(req.points):
            if len(pt) != 2:
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {i + 1} must have exactly 2 values, got {len(pt)}.",
                )
    else:
        # Multi-series: ensure all rows are the same width (≥ 2)
        width = len(req.points[0])
        if width < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 columns.")
        for i, pt in enumerate(req.points):
            if len(pt) != width:
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {i + 1} has {len(pt)} values, expected {width}.",
                )

    try:
        if req.mode == "straight-line":
            fit_params = fit_straight_line(req.points)
        elif req.mode == "cmc":
            if len(req.points) < 4:
                raise HTTPException(
                    status_code=400,
                    detail="CMC fitting requires at least 4 data points.",
                )
            fit_params = fit_cmc(req.points)
        elif req.mode in ("photoelectric-1-1", "photoelectric-1-3"):
            fit_params = fit_photoelectric_vi(req.points, req.columns)
        elif req.mode == "photoelectric-1-2":
            fit_params = fit_photoelectric_h(req.points)
        elif req.mode == "single-slit":
            fit_params = fit_single_slit(req.points)
        elif req.mode == "newtons-rings":
            fit_params = fit_newtons_rings(req.points)
        elif req.mode == "pohls-damped":
            fit_params = fit_pohls_damped(req.points, req.columns)
        elif req.mode == "pohls-forced":
            fit_params = fit_pohls_forced(req.points, req.columns)
        elif req.mode == "polarization":
            fit_params = fit_polarization(req.points)
        elif req.mode == "waves":
            fit_params = fit_waves(req.points)
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown fitting mode: '{req.mode}'"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fitting error: {str(e)}")

    try:
        graph_image = generate_graph(req.points, fit_params, req.mode, req.columns)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Graph generation error: {str(e)}"
        )

    return {
        "equation": fit_params["equation"],
        "description": fit_params["description"],
        "points": req.points,
        "columns": req.columns,
        "graphImage": graph_image,
        "fitParams": fit_params,
    }
