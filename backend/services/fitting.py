"""
Curve fitting service — fits parametric equations to data based on the selected mode.
"""

import numpy as np
from scipy.optimize import curve_fit


def fit_straight_line(points: list[list[float]]) -> dict:
    """
    Fit y = mx + c using least-squares linear regression.

    Returns dict with m, c, equation string, r_squared.
    """
    arr = np.array(points, dtype=float)
    x = arr[:, 0]
    y = arr[:, 1]
    n = len(x)

    # Closed-form least squares: m = (n Σxy − Σx Σy) / (n Σx² − (Σx)²)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x ** 2)

    denom = n * sum_x2 - sum_x ** 2
    if abs(denom) < 1e-15:
        raise ValueError("All x-values are identical; cannot fit a line.")

    m = (n * sum_xy - sum_x * sum_y) / denom
    c = (sum_y - m * sum_x) / n

    # R² = 1 − SS_res / SS_tot
    y_pred = m * x + c
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_sq = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    # Format equation string
    sign = "+" if c >= 0 else "−"
    c_abs = abs(c)
    equation = f"y = {m:.4f}x {sign} {c_abs:.4f}"

    return {
        "m": float(m),
        "c": float(c),
        "equation": equation,
        "r_squared": float(r_sq),
        "description": (
            f"Fitted a straight line (y = mx + c) using least-squares regression. "
            f"R² = {r_sq:.6f}."
        ),
    }


def _szyszkowski_continuous(x, a, b, c, x0):
    """
    Szyszkowski-type piecewise model for CMC detection (continuous).

    This is derived from the Langmuir adsorption isotherm + Gibbs equation:
        γ = γ₀ + RTΓ∞·ln(1 + K·c)

    In our parameterisation:
        - For x < x0 (pre-CMC):   y = a + b·ln(1 + c·x)
          The log curve captures the gradual decrease in surface tension as
          surfactant molecules adsorb at the air-water interface.

        - For x ≥ x0 (post-CMC):  y = a + b·ln(1 + c·x0)   (constant plateau)
          Beyond CMC, additional surfactant forms micelles in bulk solution;
          the interface is saturated so surface tension stays constant.

    Continuity is enforced: the plateau value equals the curve value at x0.
    This reduces the problem to 4 free parameters: a, b, c, x0.
    """
    # Clamp x to non-negative to avoid log of negative numbers
    x_safe = np.clip(x, 0, None)
    # Plateau = curve value at the breakpoint x0
    plateau = a + b * np.log(1.0 + c * max(x0, 1e-15))
    return np.where(
        x < x0,
        a + b * np.log(1.0 + c * x_safe),
        plateau,
    )


def fit_cmc(points: list[list[float]]) -> dict:
    """
    Fit concentration (x) vs surface tension (y) to find the CMC.

    Model (Szyszkowski-type, physically motivated):
        Pre-CMC :  y = a + b·ln(1 + c·x)     (log adsorption curve)
        Post-CMC:  y = d  (constant)           where d = a + b·ln(1 + c·x0)

    Fitting strategy:
        1. Grid-search over candidate breakpoints (x0) across the data range.
           For each candidate, fit a, b, c on the left segment only and
           compute total RSS (left curve + right plateau).
        2. Use the best grid-search result as the initial guess for a full
           4-parameter curve_fit over the continuous model.
        3. Compute R² and build human-readable equation strings.

    Parameters
    ----------
    points : list of [concentration, surface_tension] pairs

    Returns
    -------
    dict with cmc_value, fitted parameters (a, b, c), equations, r_squared, etc.
    """
    # ── Data preparation ─────────────────────────────────────────────
    arr = np.array(points, dtype=float)
    # Sort by concentration (x-axis) so fitting is monotonic
    arr = arr[arr[:, 0].argsort()]
    x = arr[:, 0]
    y = arr[:, 1]

    n = len(x)
    if n < 5:
        raise ValueError("Need at least 5 data points to fit the CMC model.")

    # ── Initial parameter guesses ────────────────────────────────────
    # a ≈ surface tension of pure solvent (highest y, usually the first point)
    a_guess = float(y.max())
    # b < 0 because surface tension *decreases* with surfactant concentration
    b_guess = float(y.min() - y.max())
    # c ≈ reciprocal of the smallest positive concentration (sets x-scale for log)
    c_guess = 1.0 / (float(x[x > 0].min()) if np.any(x > 0) else 1.0)
    # x0 ≈ somewhere in the middle-to-upper range of x
    x0_guess = float(np.median(x))

    # ── Phase 1: Grid search over candidate breakpoints ──────────────
    # For each candidate x0, split the data into left / right.
    # The right segment is modelled as a horizontal line (plateau).
    # The optimal plateau is simply the mean of points on the right,
    # and the RSS for a horizontal line = sum of squared deviations
    # from that mean.  No curve_fit needed — this is O(n) per candidate
    # and extremely fast.
    #
    # The candidate x0 with the smallest right-side RSS tells us
    # where the data starts to flatten, i.e. the CMC region.
    best_rss = float("inf")
    best_x0 = x0_guess

    # Build candidate breakpoint list: data x-values plus extra linspace points
    candidates = np.unique(
        np.concatenate([
            x[2:-2],  # skip edges to ensure enough points per segment
            np.linspace(x[2], x[-2], min(50, n)),
        ])
    )

    for x0_cand in candidates:
        mask_right = x >= x0_cand

        # Need at least 2 points on the right to compute a meaningful plateau
        if mask_right.sum() < 2:
            continue

        y_right = y[mask_right]

        # Best horizontal line through the right segment = its mean
        plateau = y_right.mean()
        rss = np.sum((y_right - plateau) ** 2)

        if rss < best_rss:
            best_rss = rss
            best_x0 = float(x0_cand)

    # ── Phase 2: Full nonlinear refinement ───────────────────────────
    # Use the best grid-search x0 to seed a curve_fit over all 4 parameters
    # on the full continuous model. This fits the log curve (a, b, c)
    # and fine-tunes x0 to a value that may lie *between* data points.
    p0_full = [a_guess, b_guess, c_guess, best_x0]

    try:
        popt_final, pcov = curve_fit(
            _szyszkowski_continuous,
            x, y,
            p0=p0_full,
            bounds=(
                [-np.inf, -np.inf, 1e-12, float(x.min())],  # x0 within data range
                [np.inf,   np.inf, np.inf, float(x.max())],
            ),
            maxfev=20000,
        )
        a_opt, b_opt, c_opt, x0_opt = popt_final
    except (RuntimeError, ValueError):
        raise RuntimeError(
            "CMC fitting failed — check that the data has a clear "
            "transition from decreasing surface tension to a plateau."
        )

    # ── Compute derived quantities ───────────────────────────────────
    cmc_value = float(x0_opt)
    # Surface tension at the CMC (plateau value, from continuity)
    plateau = float(a_opt + b_opt * np.log(1.0 + c_opt * x0_opt))

    # Goodness-of-fit: coefficient of determination (R²)
    y_pred = _szyszkowski_continuous(x, a_opt, b_opt, c_opt, x0_opt)
    ss_res = np.sum((y - y_pred) ** 2)       # residual sum of squares
    ss_tot = np.sum((y - np.mean(y)) ** 2)   # total sum of squares
    r_sq = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    # ── Build human-readable equation strings ────────────────────────
    b_sign = "+" if b_opt >= 0 else "−"
    eq_pre = f"γ = {a_opt:.4f} {b_sign} {abs(b_opt):.4f}·ln(1 + {c_opt:.4f}·x)"
    eq_post = f"γ = {plateau:.4f}"

    return {
        # Core CMC result
        "cmc_value": cmc_value,
        "cmc_surface_tension": plateau,
        # Fitted model parameters (Szyszkowski: y = a + b·ln(1 + c·x))
        "a": float(a_opt),
        "b": float(b_opt),
        "c": float(c_opt),
        # Equation strings for display
        "equation": f"CMC ≈ {cmc_value:.4g}",
        "equation_pre_cmc": eq_pre,    # pre-CMC log curve
        "equation_post_cmc": eq_post,  # post-CMC plateau
        # Goodness of fit
        "r_squared": float(r_sq),
        "description": (
            f"Szyszkowski-type model: γ = a + b·ln(1 + c·x) for x < CMC, "
            f"γ = constant for x ≥ CMC. "
            f"Breakpoint at x = {cmc_value:.4g} gives the CMC. "
            f"R² = {r_sq:.6f}."
        ),
    }


# ─────────────────────────────────────────────────────────────────────
#  New experiment-specific fitting functions
# ─────────────────────────────────────────────────────────────────────

def _find_zero_crossing(x, y):
    """Find x-value where y crosses zero via linear interpolation."""
    for j in range(len(y) - 1):
        if y[j] * y[j + 1] <= 0 and y[j] != y[j + 1]:
            return float(
                x[j] + (0 - y[j]) * (x[j + 1] - x[j]) / (y[j + 1] - y[j])
            )
    # Fallback: x where |y| is smallest
    return float(x[np.argmin(np.abs(y))])


def fit_photoelectric_vi(points: list[list[float]], columns: list[str] = None) -> dict:
    """
    V_bias vs photocurrent for multiple wavelengths or separations.
    Finds the stopping potential (V where I → 0) for each series.
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    x = arr[:, 0]
    series_count = arr.shape[1] - 1

    if series_count < 1:
        raise ValueError("Need at least 2 columns (V_bias + one current series).")

    series_labels = (
        columns[1:] if columns and len(columns) > 1
        else [f"Series {i + 1}" for i in range(series_count)]
    )

    stopping_potentials = {}
    for i in range(series_count):
        y = arr[:, i + 1]
        v_stop = _find_zero_crossing(x, y)
        stopping_potentials[series_labels[i]] = round(v_stop, 4)

    eq_parts = [f"{lbl}: V_stop = {v:.4g} V" for lbl, v in stopping_potentials.items()]
    return {
        "equation": "; ".join(eq_parts),
        "description": (
            f"V_bias vs photocurrent for {series_count} series. "
            f"Stopping potentials found by interpolation where I → 0."
        ),
        "stopping_potentials": stopping_potentials,
        "series_labels": series_labels,
        "series_count": series_count,
        "r_squared": None,
    }


def fit_photoelectric_h(points: list[list[float]]) -> dict:
    """
    Stopping voltage vs frequency → linear fit.
    V_stop = (h/e)·ν − W/e  →  slope = h/e  →  h = slope × e.
    """
    result = fit_straight_line(points)
    e = 1.602176634e-19  # C
    h_calc = abs(result["m"]) * e
    h_actual = 6.62607015e-34

    result["equation"] = f"V_stop = {result['m']:.6g}·ν + ({result['c']:.6g})"
    result["description"] = (
        f"Stopping voltage vs frequency: slope = h/e = {result['m']:.6g}. "
        f"Calculated h = {h_calc:.4e} J·s (accepted: {h_actual:.4e} J·s). "
        f"R² = {result['r_squared']:.6f}."
    )
    result["h_calculated"] = float(h_calc)
    result["h_actual"] = h_actual
    result["work_function_over_e"] = float(-result["c"])
    return result


def _sinc_squared(theta, I0, alpha, theta0):
    """Single slit diffraction: I = I₀ [sin(β)/β]² where β = α(θ − θ₀)."""
    beta = alpha * (theta - theta0)
    return np.where(np.abs(beta) < 1e-10, I0, I0 * (np.sin(beta) / beta) ** 2)


def fit_single_slit(points: list[list[float]]) -> dict:
    """
    Fit single slit diffraction: I vs θ.
    Model: I = I₀ [sin(α(θ−θ₀)) / (α(θ−θ₀))]²
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    theta = arr[:, 0]
    intensity = arr[:, 1]

    I0_guess = float(intensity.max())
    theta0_guess = float(theta[np.argmax(intensity)])
    alpha_guess = 10.0

    try:
        popt, _ = curve_fit(
            _sinc_squared, theta, intensity,
            p0=[I0_guess, alpha_guess, theta0_guess],
            maxfev=20000,
        )
        I0, alpha, theta0 = popt
    except (RuntimeError, ValueError):
        raise RuntimeError(
            "Failed to fit single slit diffraction pattern. "
            "Check that the data has a clear central maximum."
        )

    y_pred = _sinc_squared(theta, I0, alpha, theta0)
    ss_res = np.sum((intensity - y_pred) ** 2)
    ss_tot = np.sum((intensity - np.mean(intensity)) ** 2)
    r_sq = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    return {
        "equation": f"I = {I0:.4f} × [sin({alpha:.4f}·(θ−{theta0:.4f})) / ({alpha:.4f}·(θ−{theta0:.4f}))]²",
        "description": (
            f"Single slit diffraction fitted with sinc² model. "
            f"Central maximum at θ₀ = {theta0:.4f}. I₀ = {I0:.4f}. R² = {r_sq:.6f}."
        ),
        "I0": float(I0),
        "alpha": float(alpha),
        "theta0": float(theta0),
        "r_squared": float(r_sq),
    }


def fit_newtons_rings(points: list[list[float]]) -> dict:
    """
    Input: [[n, D_n], ...].
    Transforms to D² vs n, then linear fit.
    D² = slope·n + intercept, where slope = 4Rλ.
    """
    arr = np.array(points, dtype=float)
    n = arr[:, 0]
    d = arr[:, 1]
    d_sq = d ** 2

    transformed = [[float(n[i]), float(d_sq[i])] for i in range(len(n))]
    result = fit_straight_line(transformed)

    slope = result["m"]
    intercept = result["c"]
    r_sq = result["r_squared"]
    sign = "+" if intercept >= 0 else "−"

    result["equation"] = f"D² = {slope:.4f}·n {sign} {abs(intercept):.4f}"
    result["description"] = (
        f"Newton's Rings: D² vs n fitted with least squares. "
        f"Slope = {slope:.4f} (= 4Rλ). R² = {r_sq:.6f}."
    )
    result["slope_4Rlambda"] = float(slope)
    result["transformed_points"] = transformed
    return result


def fit_pohls_damped(points: list[list[float]], columns: list[str] = None) -> dict:
    """
    Damped oscillation: [[t, φ₁, φ₂, ...], ...].
    Transforms to ln(φ) and fits a straight line per series.
    ln(φ) = −δ·t + const  →  damping constant δ = −slope.
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    t = arr[:, 0]
    series_count = arr.shape[1] - 1

    if series_count < 1:
        raise ValueError("Need at least 2 columns (t + one amplitude series).")

    series_labels = (
        columns[1:] if columns and len(columns) > 1
        else [f"I_d = {i + 1}" for i in range(series_count)]
    )

    series_fits = {}
    eq_parts = []

    for i in range(series_count):
        phi = arr[:, i + 1]
        label = series_labels[i]
        mask = phi > 0
        if mask.sum() < 2:
            continue

        ln_phi = np.log(phi[mask])
        t_valid = t[mask]
        pts = [[float(t_valid[j]), float(ln_phi[j])] for j in range(len(t_valid))]
        res = fit_straight_line(pts)

        damping = -res["m"]
        series_fits[label] = {
            "slope": res["m"],
            "intercept": res["c"],
            "damping_constant": float(damping),
            "r_squared": res["r_squared"],
        }
        eq_parts.append(f"{label}: δ = {damping:.4f}")

    return {
        "equation": "; ".join(eq_parts) if eq_parts else "No valid fits",
        "description": (
            f"Damped oscillation: ln(φ) vs t fitted for {len(series_fits)} damping levels. "
            f"Slope = −δ (damping constant)."
        ),
        "series_fits": series_fits,
        "series_labels": series_labels,
        "series_count": series_count,
        "r_squared": None,
    }


def fit_pohls_forced(points: list[list[float]], columns: list[str] = None) -> dict:
    """
    Forced oscillation: [[freq, A₁, A₂, ...], ...].
    Finds resonance frequency (peak amplitude) for each damping value.
    """
    arr = np.array(points, dtype=float)
    arr = arr[arr[:, 0].argsort()]
    freq = arr[:, 0]
    series_count = arr.shape[1] - 1

    if series_count < 1:
        raise ValueError("Need at least 2 columns (frequency + one amplitude series).")

    series_labels = (
        columns[1:] if columns and len(columns) > 1
        else [f"Damping {i + 1}" for i in range(series_count)]
    )

    resonances = {}
    eq_parts = []

    for i in range(series_count):
        amp = arr[:, i + 1]
        label = series_labels[i]
        peak_idx = int(np.argmax(amp))
        f_res = float(freq[peak_idx])
        a_max = float(amp[peak_idx])
        resonances[label] = {
            "resonance_frequency": f_res,
            "max_amplitude": a_max,
        }
        eq_parts.append(f"{label}: f_res = {f_res:.4g}")

    return {
        "equation": "; ".join(eq_parts),
        "description": (
            f"Forced oscillation: amplitude vs frequency for {series_count} damping values. "
            f"Resonance at peak amplitude for each."
        ),
        "resonances": resonances,
        "series_labels": series_labels,
        "series_count": series_count,
        "r_squared": None,
    }


def fit_polarization(points: list[list[float]]) -> dict:
    """
    Optical rotation: θ vs c → linear fit.
    θ = [α]·l·c  →  slope = [α]·l.
    """
    result = fit_straight_line(points)
    slope = result["m"]
    r_sq = result["r_squared"]
    sign = "+" if result["c"] >= 0 else "−"

    result["equation"] = f"θ = {slope:.4f}·c {sign} {abs(result['c']):.4f}"
    result["description"] = (
        f"Optical rotation: θ vs concentration fitted with least squares. "
        f"Slope = {slope:.4f} (= [α]·l). R² = {r_sq:.6f}."
    )
    result["specific_rotation_times_l"] = float(slope)
    return result


def fit_waves_rope(points: list[list[float]]) -> dict:
    """
    Input: [[group, 1/ν, λ], ...] — grouped rope wave data.
    Groups by column 0 (group ID), then fits λ vs 1/ν per group.
    Each group's slope = phase velocity for that tension.

    Returns dict with per-group fits, equations, and overall description.
    """
    arr = np.array(points, dtype=float)
    groups = np.unique(arr[:, 0])

    series_fits = {}
    eq_parts = []
    group_labels = []

    for idx, g in enumerate(sorted(groups)):
        mask = arr[:, 0] == g
        inv_nu = arr[mask, 1]
        lam = arr[mask, 2]

        if len(inv_nu) < 2:
            continue

        transformed = [[float(inv_nu[i]), float(lam[i])] for i in range(len(inv_nu))]
        result = fit_straight_line(transformed)

        label = f"T{idx + 1}"
        velocity = result["m"]
        r_sq = result["r_squared"]
        sign = "+" if result["c"] >= 0 else "−"

        line_eq = f"λ = {velocity:.2f}·(1/ν) {sign} {abs(result['c']):.4f}"

        series_fits[label] = {
            "slope": result["m"],
            "intercept": result["c"],
            "phase_velocity": float(velocity),
            "r_squared": result["r_squared"],
            "transformed_points": transformed,
            "line_equation": line_eq,
        }
        eq_parts.append(f"{label}: {line_eq}  →  v = {velocity:.2f} m/s  (R² = {r_sq:.4f})")
        group_labels.append(label)

    if not series_fits:
        raise ValueError("No valid groups found in rope wave data.")

    return {
        "equation": "\n".join(eq_parts),
        "description": (
            f"Phase velocity of rope waves: λ vs 1/ν fitted for {len(series_fits)} tension groups. "
            f"Slope of each line = phase velocity."
        ),
        "series_fits": series_fits,
        "series_labels": group_labels,
        "series_count": len(series_fits),
        "r_squared": None,
    }


def fit_waves_sound(points: list[list[float]]) -> dict:
    """
    Input: [[frequency_hz, length_cm], ...] — sound wave data.
    Computes 1/ν and λ = 4L/100 (fundamental mode, closed pipe, cm → m).
    Fits λ vs 1/ν. Slope = speed of sound.

    Returns dict with fit parameters and speed of sound.
    """
    arr = np.array(points, dtype=float)
    freq = arr[:, 0]
    length_cm = arr[:, 1]

    if np.any(freq == 0):
        raise ValueError("Frequency values must be non-zero.")

    # Compute derived quantities
    inv_nu = 1.0 / freq
    # For closed pipe, fundamental mode: λ = 4L
    lam = 4.0 * length_cm / 100.0  # convert cm to m

    transformed = [[float(inv_nu[i]), float(lam[i])] for i in range(len(freq))]
    result = fit_straight_line(transformed)

    velocity = result["m"]
    r_sq = result["r_squared"]
    sign = "+" if result["c"] >= 0 else "−"

    result["equation"] = f"λ = {velocity:.2f}·(1/ν) {sign} {abs(result['c']):.4f}"
    result["description"] = (
        f"Velocity of sound in air: λ vs 1/ν fitted with least squares. "
        f"Slope = {velocity:.2f} m/s (speed of sound). R² = {r_sq:.6f}."
    )
    result["phase_velocity"] = float(velocity)
    result["transformed_points"] = transformed
    return result
