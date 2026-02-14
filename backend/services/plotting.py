"""
Graph generation service — produces a clean matplotlib plot as a base64 PNG.
"""

import base64
import io

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np


def generate_graph(points: list[list[float]], fit_params: dict, mode: str) -> str:
    """
    Create a publication-style scatter + fitted curve plot.

    Returns a base64-encoded PNG data URL string.
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    x = arr[:, 0]
    y = arr[:, 1]

    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # Scatter data points
    ax.scatter(x, y, color="#2563eb", s=60, zorder=5, label="Data Points", edgecolors="white", linewidths=0.5)

    # Generate smooth x range for fitted curve
    x_smooth = np.linspace(x.min(), x.max(), 300)

    if mode == "straight-line":
        m = fit_params["m"]
        c = fit_params["c"]
        y_fit = m * x_smooth + c
        ax.plot(x_smooth, y_fit, color="#dc2626", linewidth=2, label=f"Fit: {fit_params['equation']}")
        ax.set_xlabel("X", fontsize=12)
        ax.set_ylabel("Y", fontsize=12)
        ax.set_title("Straight Line Fit", fontsize=14, fontweight="bold")

        # Annotate equation + R²
        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes,
            fontsize=10,
            verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
        )

    elif mode == "cmc":
        cmc_x = fit_params["cmc_value"]
        cmc_y = fit_params["cmc_surface_tension"]
        a = fit_params["a"]
        b = fit_params["b"]
        c = fit_params["c"]

        # Pre-CMC region: Szyszkowski log curve  y = a + b·ln(1 + c·x)
        x_left = x_smooth[x_smooth <= cmc_x]
        if len(x_left) > 0:
            y_left = a + b * np.log(1.0 + c * np.clip(x_left, 0, None))
            ax.plot(x_left, y_left, color="#dc2626", linewidth=2, label="Pre-CMC curve")

        # Post-CMC region: constant plateau (surface tension saturated)
        x_right = x_smooth[x_smooth >= cmc_x]
        if len(x_right) > 0:
            y_right = np.full_like(x_right, cmc_y)
            ax.plot(x_right, y_right, color="#16a34a", linewidth=2, label="Post-CMC plateau")

        # CMC marker
        ax.axvline(x=cmc_x, color="#9333ea", linestyle="--", linewidth=1.5, alpha=0.7)
        ax.scatter([cmc_x], [cmc_y], color="#9333ea", s=100, zorder=6, marker="D", label=f"CMC ≈ {cmc_x:.4g}")

        ax.set_xlabel("Concentration", fontsize=12)
        ax.set_ylabel("Surface Tension", fontsize=12)
        ax.set_title("CMC Determination", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"CMC ≈ {cmc_x:.4g}\nSurface Tension at CMC ≈ {cmc_y:.4g}",
            transform=ax.transAxes,
            fontsize=10,
            verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#f0fdf4", edgecolor="#86efac"),
        )

    ax.legend(fontsize=9, loc="lower right")
    ax.grid(True, alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()

    # Save to base64
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
