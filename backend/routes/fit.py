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
    fit_waves_rope,
    fit_waves_sound,
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


class FitWavesRequest(BaseModel):
    rope_points: list[list[float]]
    rope_columns: list[str] = []
    sound_points: list[list[float]]
    sound_columns: list[str] = []


@router.post("/fit-waves")
async def fit_waves_endpoint(req: FitWavesRequest):
    """Fit both rope wave (Table 1) and sound wave (Table 2) data.
    Returns two separate graphs and fit parameters."""

    if len(req.rope_points) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 rope data points.")
    if len(req.sound_points) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 sound data points.")

    # Validate row widths
    for i, pt in enumerate(req.rope_points):
        if len(pt) != 3:
            raise HTTPException(
                status_code=400,
                detail=f"Rope row {i + 1} must have 3 values (group, 1/ν, λ), got {len(pt)}.",
            )
    for i, pt in enumerate(req.sound_points):
        if len(pt) != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Sound row {i + 1} must have 2 values (freq, length_cm), got {len(pt)}.",
            )

    try:
        rope_fit = fit_waves_rope(req.rope_points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rope wave fitting error: {str(e)}")

    try:
        sound_fit = fit_waves_sound(req.sound_points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sound wave fitting error: {str(e)}")

    try:
        rope_graph = generate_graph(req.rope_points, rope_fit, "waves-rope", req.rope_columns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rope graph error: {str(e)}")

    try:
        sound_graph = generate_graph(req.sound_points, sound_fit, "waves-sound", req.sound_columns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sound graph error: {str(e)}")

    return {
        "equation": (
            "── Rope Waves (Transverse) ──\n"
            + rope_fit["equation"]
            + "\n\n── Sound Waves (Longitudinal) ──\n"
            + sound_fit["equation"]
            + f"  →  v = {sound_fit['phase_velocity']:.2f} m/s  (R² = {sound_fit['r_squared']:.4f})"
        ),
        "description": rope_fit["description"] + "\n" + sound_fit["description"],
        "ropeGraphImage": rope_graph,
        "soundGraphImage": sound_graph,
        "ropeFitParams": rope_fit,
        "soundFitParams": sound_fit,
        "ropePoints": req.rope_points,
        "soundPoints": req.sound_points,
        "ropeColumns": req.rope_columns,
        "soundColumns": req.sound_columns,
    }
