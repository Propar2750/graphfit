"""
POST /api/fit — receives confirmed data points + mode, returns fitted equation + graph image.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.fitting import fit_straight_line, fit_cmc
from services.plotting import generate_graph

router = APIRouter()


class FitRequest(BaseModel):
    mode: str
    points: list[list[float]]


@router.post("/fit")
async def fit(req: FitRequest):
    if len(req.points) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 data points.")

    # Validate each point has exactly 2 values
    for i, pt in enumerate(req.points):
        if len(pt) != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Row {i + 1} must have exactly 2 values, got {len(pt)}.",
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
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown fitting mode: '{req.mode}'"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fitting error: {str(e)}")

    try:
        graph_image = generate_graph(req.points, fit_params, req.mode)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Graph generation error: {str(e)}"
        )

    return {
        "equation": fit_params["equation"],
        "description": fit_params["description"],
        "points": req.points,
        "graphImage": graph_image,
        "fitParams": fit_params,
    }
