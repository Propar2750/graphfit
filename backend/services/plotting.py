"""
Graph generation service — produces a clean matplotlib plot as a base64 PNG.
"""

import base64
import io

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

# Colour palette & marker set for multi-series plots
SERIES_COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#9333ea",
    "#ea580c", "#0891b2", "#be185d", "#4f46e5",
]
SERIES_MARKERS = ["o", "s", "^", "D", "v", "p", "h", "*"]


def generate_graph(
    points: list[list[float]],
    fit_params: dict,
    mode: str,
    columns: list[str] | None = None,
) -> str:
    """
    Create a publication-style plot for any fitting mode.

    Returns a base64-encoded PNG data URL string.
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    x = arr[:, 0]

    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    # ── Straight Line ────────────────────────────────────────────────
    if mode == "straight-line":
        y = arr[:, 1]
        ax.scatter(x, y, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(x.min(), x.max(), 300)
        m = fit_params["m"]
        c = fit_params["c"]
        y_fit = m * x_smooth + c
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2,
                label=f"Fit: {fit_params['equation']}")

        ax.set_xlabel("X", fontsize=12)
        ax.set_ylabel("Y", fontsize=12)
        ax.set_title("Straight Line Fit", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=10, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
        )

    # ── CMC ──────────────────────────────────────────────────────────
    elif mode == "cmc":
        y = arr[:, 1]
        ax.scatter(x, y, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(x.min(), x.max(), 300)
        cmc_x = fit_params["cmc_value"]
        cmc_y = fit_params["cmc_surface_tension"]
        a = fit_params["a"]
        b = fit_params["b"]
        c = fit_params["c"]

        x_left = x_smooth[x_smooth <= cmc_x]
        if len(x_left) > 0:
            y_left = a + b * np.log(1.0 + c * np.clip(x_left, 0, None))
            ax.plot(x_left, y_left, color=SERIES_COLORS[1], linewidth=2, label="Pre-CMC curve")

        x_right = x_smooth[x_smooth >= cmc_x]
        if len(x_right) > 0:
            y_right = np.full_like(x_right, cmc_y)
            ax.plot(x_right, y_right, color=SERIES_COLORS[2], linewidth=2, label="Post-CMC plateau")

        ax.axvline(x=cmc_x, color="#9333ea", linestyle="--", linewidth=1.5, alpha=0.7)
        ax.scatter([cmc_x], [cmc_y], color="#9333ea", s=100, zorder=6, marker="D",
                   label=f"CMC ≈ {cmc_x:.4g}")

        ax.set_xlabel("Concentration", fontsize=12)
        ax.set_ylabel("Surface Tension", fontsize=12)
        ax.set_title("CMC Determination", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"CMC ≈ {cmc_x:.4g}\nSurface Tension at CMC ≈ {cmc_y:.4g}",
            transform=ax.transAxes, fontsize=10, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#f0fdf4", edgecolor="#86efac"),
        )

    # ── Photoelectric 1.1 / 1.3 — multi-series V-I curves ───────────
    elif mode in ("photoelectric-1-1", "photoelectric-1-3"):
        series_count = arr.shape[1] - 1
        series_labels = fit_params.get("series_labels",
                                       [f"Series {i+1}" for i in range(series_count)])
        stopping_pots = fit_params.get("stopping_potentials", {})

        for i in range(series_count):
            y_s = arr[:, i + 1]
            clr = SERIES_COLORS[i % len(SERIES_COLORS)]
            mkr = SERIES_MARKERS[i % len(SERIES_MARKERS)]
            label = series_labels[i]

            ax.scatter(x, y_s, color=clr, s=40, marker=mkr, zorder=5,
                       edgecolors="white", linewidths=0.5)
            ax.plot(x, y_s, color=clr, linewidth=1.5, alpha=0.7, label=label)

            if label in stopping_pots:
                v_stop = stopping_pots[label]
                ax.axvline(x=v_stop, color=clr, linestyle="--", linewidth=1, alpha=0.5)
                ax.scatter([v_stop], [0], color=clr, s=80, marker="x", zorder=6, linewidths=2)

        ax.axhline(y=0, color="gray", linestyle="-", linewidth=0.5, alpha=0.5)

        title = "Photoelectric Effect — V-I Characteristics"
        if mode == "photoelectric-1-1":
            title += " (Various Wavelengths)"
        else:
            title += " (Various Separations)"
        ax.set_xlabel("V_bias (V)", fontsize=12)
        ax.set_ylabel("Photocurrent I", fontsize=12)
        ax.set_title(title, fontsize=14, fontweight="bold")

        sp_text = "\n".join(
            [f"{lbl}: V_stop = {v:.4g} V" for lbl, v in stopping_pots.items()]
        )
        if sp_text:
            ax.text(
                0.02, 0.98, sp_text,
                transform=ax.transAxes, fontsize=8, verticalalignment="top",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="#fef3c7", edgecolor="#fbbf24"),
            )

    # ── Photoelectric 1.2 — V_stop vs ν (linear, find h) ────────────
    elif mode == "photoelectric-1-2":
        y = arr[:, 1]
        ax.scatter(x, y, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(x.min(), x.max(), 300)
        m = fit_params["m"]
        c_val = fit_params["c"]
        y_fit = m * x_smooth + c_val
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2, label="Linear fit")

        ax.set_xlabel("Frequency ν (Hz)", fontsize=12)
        ax.set_ylabel("Stopping Potential V_stop (V)", fontsize=12)
        ax.set_title("Photoelectric Effect — V_stop vs Frequency", fontsize=14, fontweight="bold")

        h_calc = fit_params.get("h_calculated", 0)
        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nSlope = h/e = {m:.6g}\n"
            f"h ≈ {h_calc:.4e} J·s\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=9, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
        )

    # ── Single Slit Diffraction ──────────────────────────────────────
    elif mode == "single-slit":
        y = arr[:, 1]
        ax.scatter(x, y, color=SERIES_COLORS[0], s=40, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        I0 = fit_params["I0"]
        alpha = fit_params["alpha"]
        theta0 = fit_params["theta0"]

        x_smooth = np.linspace(x.min(), x.max(), 500)
        beta = alpha * (x_smooth - theta0)
        y_fit = np.where(np.abs(beta) < 1e-10, I0, I0 * (np.sin(beta) / beta) ** 2)
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2, label="sinc² fit")

        # Mark central maximum
        ax.axvline(x=theta0, color=SERIES_COLORS[3], linestyle=":", linewidth=1, alpha=0.6)
        ax.scatter([theta0], [I0], color=SERIES_COLORS[3], s=80, marker="D", zorder=6,
                   label=f"Central max θ₀ = {theta0:.4f}")

        ax.set_xlabel("θ (angle)", fontsize=12)
        ax.set_ylabel("Intensity I", fontsize=12)
        ax.set_title("Single Slit Diffraction — Intensity Distribution", fontsize=14, fontweight="bold")

        ax.text(
            0.02, 0.95,
            f"I₀ = {I0:.4f}\nθ₀ = {theta0:.4f}\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=9, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#fef3c7", edgecolor="#fbbf24"),
        )

    # ── Newton's Rings — D² vs n ─────────────────────────────────────
    elif mode == "newtons-rings":
        transformed = fit_params.get("transformed_points")
        if transformed:
            t_arr = np.array(transformed, dtype=float)
            t_arr = t_arr[t_arr[:, 0].argsort()]
            xp, yp = t_arr[:, 0], t_arr[:, 1]
        else:
            xp, yp = x, arr[:, 1] ** 2

        ax.scatter(xp, yp, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data (D² vs n)", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(xp.min(), xp.max(), 300)
        m = fit_params["m"]
        c_val = fit_params["c"]
        y_fit = m * x_smooth + c_val
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2,
                label=f"Fit: {fit_params['equation']}")

        ax.set_xlabel("Ring number n", fontsize=12)
        ax.set_ylabel("D² (diameter squared)", fontsize=12)
        ax.set_title("Newton's Rings — D² vs n", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nSlope = 4Rλ = {m:.4f}\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=10, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
        )

    # ── Pohl's Pendulum — Damped Oscillation ─────────────────────────
    elif mode == "pohls-damped":
        t = arr[:, 0]
        series_count = arr.shape[1] - 1
        series_labels = fit_params.get("series_labels",
                                       [f"Damping {i+1}" for i in range(series_count)])
        series_fits = fit_params.get("series_fits", {})

        for i in range(series_count):
            phi = arr[:, i + 1]
            label = series_labels[i]
            clr = SERIES_COLORS[i % len(SERIES_COLORS)]
            mkr = SERIES_MARKERS[i % len(SERIES_MARKERS)]

            mask = phi > 0
            if mask.sum() < 2:
                continue

            ln_phi = np.log(phi[mask])
            t_valid = t[mask]

            ax.scatter(t_valid, ln_phi, color=clr, s=40, marker=mkr, zorder=5,
                       edgecolors="white", linewidths=0.5, label=label)

            if label in series_fits:
                sf = series_fits[label]
                t_line = np.linspace(t_valid.min(), t_valid.max(), 100)
                ax.plot(t_line, sf["slope"] * t_line + sf["intercept"],
                        color=clr, linewidth=1.5, alpha=0.8)

        ax.set_xlabel("Time t", fontsize=12)
        ax.set_ylabel("ln(φ)", fontsize=12)
        ax.set_title("Pohl's Pendulum — Damped Oscillation", fontsize=14, fontweight="bold")

        annot = [
            f"{lbl}: δ = {sf['damping_constant']:.4f}, R² = {sf['r_squared']:.4f}"
            for lbl, sf in series_fits.items()
        ]
        if annot:
            ax.text(
                0.02, 0.98, "\n".join(annot),
                transform=ax.transAxes, fontsize=8, verticalalignment="top",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
            )

    # ── Pohl's Pendulum — Forced Oscillation ─────────────────────────
    elif mode == "pohls-forced":
        freq = arr[:, 0]
        series_count = arr.shape[1] - 1
        series_labels = fit_params.get("series_labels",
                                       [f"Damping {i+1}" for i in range(series_count)])
        resonances = fit_params.get("resonances", {})

        for i in range(series_count):
            amp = arr[:, i + 1]
            label = series_labels[i]
            clr = SERIES_COLORS[i % len(SERIES_COLORS)]
            mkr = SERIES_MARKERS[i % len(SERIES_MARKERS)]

            ax.scatter(freq, amp, color=clr, s=40, marker=mkr, zorder=5,
                       edgecolors="white", linewidths=0.5)
            ax.plot(freq, amp, color=clr, linewidth=1.5, alpha=0.7, label=label)

            if label in resonances:
                res = resonances[label]
                ax.scatter([res["resonance_frequency"]], [res["max_amplitude"]],
                           color=clr, s=120, marker="*", zorder=6,
                           edgecolors="black", linewidths=0.5)

        ax.set_xlabel("Forcing Frequency", fontsize=12)
        ax.set_ylabel("Amplitude", fontsize=12)
        ax.set_title("Pohl's Pendulum — Forced Oscillation (Resonance)", fontsize=14, fontweight="bold")

        annot = [
            f"{lbl}: f_res = {res['resonance_frequency']:.4g}"
            for lbl, res in resonances.items()
        ]
        if annot:
            ax.text(
                0.02, 0.98, "\n".join(annot),
                transform=ax.transAxes, fontsize=8, verticalalignment="top",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="#f0fdf4", edgecolor="#86efac"),
            )

    # ── Polarization / Optical Rotation ──────────────────────────────
    elif mode == "polarization":
        y = arr[:, 1]
        ax.scatter(x, y, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(x.min(), x.max(), 300)
        m = fit_params["m"]
        c_val = fit_params["c"]
        y_fit = m * x_smooth + c_val
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2,
                label=f"Fit: {fit_params['equation']}")

        ax.set_xlabel("Concentration c", fontsize=12)
        ax.set_ylabel("Rotation Angle θ", fontsize=12)
        ax.set_title("Optical Rotation — θ vs Concentration", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nSlope = [α]·l = {m:.4f}\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=10, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#fef3c7", edgecolor="#fbbf24"),
        )

    # ── Waves — Rope (λ vs 1/ν, 3 lines per tension group) ─────────
    elif mode == "waves-rope":
        series_fits = fit_params.get("series_fits", {})
        series_labels = fit_params.get("series_labels", [])

        # Group the raw data points by group column (col 0)
        group_ids = np.unique(arr[:, 0])

        for idx, g in enumerate(sorted(group_ids)):
            mask = arr[:, 0] == g
            inv_nu = arr[mask, 1]
            lam = arr[mask, 2]

            label = series_labels[idx] if idx < len(series_labels) else f"T{idx+1}"
            clr = SERIES_COLORS[idx % len(SERIES_COLORS)]
            mkr = SERIES_MARKERS[idx % len(SERIES_MARKERS)]

            ax.scatter(inv_nu, lam, color=clr, s=50, marker=mkr, zorder=5,
                       edgecolors="white", linewidths=0.5, label=f"{label} data")

            if label in series_fits:
                sf = series_fits[label]
                x_line = np.linspace(inv_nu.min(), inv_nu.max(), 100)
                y_line = sf["slope"] * x_line + sf["intercept"]
                vel = sf["phase_velocity"]
                ax.plot(x_line, y_line, color=clr, linewidth=2, alpha=0.8,
                        label=f"{label}: v = {vel:.2f} m/s")

        ax.set_xlabel("1/ν (s)", fontsize=12)
        ax.set_ylabel("λ (m)", fontsize=12)
        ax.set_title("Transverse Waves — λ vs 1/ν (Rope)", fontsize=14, fontweight="bold")

        annot = [
            f"{lbl}: v = {sf['phase_velocity']:.2f} m/s, R² = {sf['r_squared']:.4f}"
            for lbl, sf in series_fits.items()
        ]
        if annot:
            ax.text(
                0.02, 0.98, "\n".join(annot),
                transform=ax.transAxes, fontsize=8, verticalalignment="top",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
            )

    # ── Waves — Sound (λ vs 1/ν, single line) ────────────────────────
    elif mode == "waves-sound":
        transformed = fit_params.get("transformed_points")
        if transformed:
            t_arr = np.array(transformed, dtype=float)
            t_arr = t_arr[t_arr[:, 0].argsort()]
            xp, yp = t_arr[:, 0], t_arr[:, 1]
        else:
            freq = arr[:, 0]
            length_cm = arr[:, 1]
            xp = 1.0 / freq
            yp = 4.0 * length_cm / 100.0

        ax.scatter(xp, yp, color=SERIES_COLORS[0], s=60, zorder=5,
                   label="Data Points", edgecolors="white", linewidths=0.5)

        x_smooth = np.linspace(xp.min(), xp.max(), 300)
        m = fit_params["m"]
        c_val = fit_params["c"]
        y_fit = m * x_smooth + c_val
        ax.plot(x_smooth, y_fit, color=SERIES_COLORS[1], linewidth=2,
                label=f"Fit: {fit_params['equation']}")

        velocity = fit_params.get("phase_velocity", m)
        ax.set_xlabel("1/ν (s)", fontsize=12)
        ax.set_ylabel("λ (m)", fontsize=12)
        ax.set_title("Longitudinal Waves — λ vs 1/ν (Sound in Air)", fontsize=14, fontweight="bold")

        ax.text(
            0.05, 0.95,
            f"{fit_params['equation']}\nSpeed of sound = {velocity:.2f} m/s\nR² = {fit_params['r_squared']:.6f}",
            transform=ax.transAxes, fontsize=10, verticalalignment="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
        )

    # ── Common finishing ─────────────────────────────────────────────
    ax.legend(fontsize=9, loc="best")
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
