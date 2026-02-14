"""
Curve fitting service — fits parametric equations to data based on the selected mode.
"""

import numpy as np
from scipy import stats
from scipy.optimize import curve_fit


def fit_straight_line(points: list[list[float]]) -> dict:
    """
    Fit y = mx + c using least-squares linear regression.

    Returns dict with m, c, equation string, r_squared.
    """
    arr = np.array(points, dtype=float)
    x = arr[:, 0]
    y = arr[:, 1]

    result = stats.linregress(x, y)
    m = result.slope
    c = result.intercept
    r_sq = result.rvalue ** 2

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


def _log_curve(x, a, b, c):
    """
    Helper: Szyszkowski pre-CMC curve only.

    y = a + b·ln(1 + c·x)

    Used during the grid-search phase where we fit the log part
    on the left segment independently for each candidate breakpoint.
    """
    return a + b * np.log(1.0 + c * np.clip(x, 0, None))


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


def cost_function(params, x, y):
    """
    Sum-of-squared-residuals cost for the Szyszkowski continuous model.

    The model itself already returns the plateau for x >= x0, so a
    simple SSE is all that's needed (no double-counting).
    """
    a, b, c, x0 = params
    # Guard against invalid parameter values that would produce NaN
    if c <= 0 or x0 <= 0:
        return 1e30
    y_pred = _szyszkowski_continuous(x, a, b, c, x0)
    return np.sum((y - y_pred) ** 2)

def gradient_descent(params, x, y, learning_rate=1e-3, max_iters=10000,
                     bounds_lo=None, bounds_hi=None):
    """
    Adam-based gradient descent optimizer for the CMC model parameters.

    Works in *normalised* parameter space (each parameter scaled by its
    initial absolute value) so that a single learning rate is effective
    across parameters that differ by orders of magnitude (e.g. a~72 vs
    x0~0.008).  Bounds are enforced by projection after each step.

    Uses the Adam update rule (Kingma & Ba, 2015) for adaptive per-
    parameter learning rates, with central-difference numerical gradients.
    """
    params = np.asarray(params, dtype=np.float64)
    n_params = len(params)

    # ── Normalisation: work with params_norm = params / scale ────────
    scale = np.where(np.abs(params) > 1e-12, np.abs(params), 1.0)

    # Convert bounds to normalised space
    if bounds_lo is not None:
        lo_norm = np.asarray(bounds_lo, dtype=np.float64) / scale
    else:
        lo_norm = np.full(n_params, -np.inf)
    if bounds_hi is not None:
        hi_norm = np.asarray(bounds_hi, dtype=np.float64) / scale
    else:
        hi_norm = np.full(n_params, np.inf)

    p_norm = params / scale  # initial normalised params (≈ ±1)

    # ── Adam state ───────────────────────────────────────────────────
    m = np.zeros(n_params)   # 1st moment
    v = np.zeros(n_params)   # 2nd moment
    beta1, beta2, eps_adam = 0.9, 0.999, 1e-8

    eps_fd = 1e-7  # finite-difference step (in normalised space)
    perturbations = np.eye(n_params) * eps_fd

    def _cost_from_norm(pn):
        return cost_function(pn * scale, x, y)

    for t in range(1, max_iters + 1):
        # Central-difference gradient in normalised space
        p_plus = p_norm[np.newaxis, :] + perturbations
        p_minus = p_norm[np.newaxis, :] - perturbations
        costs_plus = np.array([_cost_from_norm(p) for p in p_plus])
        costs_minus = np.array([_cost_from_norm(p) for p in p_minus])
        grads = (costs_plus - costs_minus) / (2.0 * eps_fd)

        # Adam moment updates
        m = beta1 * m + (1 - beta1) * grads
        v = beta2 * v + (1 - beta2) * grads ** 2
        m_hat = m / (1 - beta1 ** t)
        v_hat = v / (1 - beta2 ** t)

        p_norm -= learning_rate * m_hat / (np.sqrt(v_hat) + eps_adam)

        # Project back to bounds
        p_norm = np.clip(p_norm, lo_norm, hi_norm)

        # Convergence check (normalised gradient norm)
        if np.dot(grads, grads) < 1e-14:
            break

    return p_norm * scale  # un-normalise
def fit_cmc_2(points: list[list[float]]) -> dict:
    """
    The better alternative from scratch method
    
    Fit concentration (x) vs surface tension (y) to find the CMC.

    Model (Szyszkowski-type, physically motivated):
        Pre-CMC :  y = a + b·ln(1 + c·x)     (log adsorption curve)
        Post-CMC:  y = d  (constant)           where d = a + b·ln(1 + c·x0)
    
    Fitting strategy:
        1. Choose random reasonable values of a, b, c, x0 within bounds.
        2. Use curve_fit to fit the continuous model with these initial parameters.
        3. Calculate the error of the straight line fit after x0
        4. Use gradient descent to iteratively adjust all parameters to minimize the combined error of the continuous fit and the straight line fit after x0.
        5. Note: Gradient descent will be able to solve this problem. 
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
    # c ≈ scale so that ln(1 + c·x_mid) ≈ 1  →  c ≈ (e-1)/x_mid
    x_mid = float(np.median(x[x > 0])) if np.any(x > 0) else 1.0
    c_guess = (np.e - 1.0) / x_mid
    # x0 ≈ breakpoint where the curve starts to flatten.
    # Use the point of maximum curvature change in y as a heuristic.
    diffs = np.abs(np.diff(y))
    cum = np.cumsum(diffs)
    # Find where 80 % of total y-change has occurred
    threshold = 0.8 * cum[-1]
    idx = int(np.searchsorted(cum, threshold))
    x0_guess = float(np.clip(x[min(idx + 1, n - 1)],
                              x[2], x[-2]))  # keep away from edges

    # ── Multi-start gradient descent ────────────────────────────────
    rng = np.random.default_rng(seed=42)
    best_cost = float("inf")
    best_params = None

    # Parameter bounds: a free, b free, c > 0, x0 within data range
    bounds_lo = np.array([-500.0, -500.0, 1e-6, float(x.min())])
    bounds_hi = np.array([500.0,   500.0, 1e8,  float(x.max())])

    # Build diverse starting points covering different regions of parameter space
    starts = []
    # Base heuristic
    starts.append(np.array([a_guess, b_guess, c_guess, x0_guess]))
    # Sweep x0 across data range (most important parameter to explore)
    for frac in [0.3, 0.5, 0.7]:
        x0_try = float(x[int(frac * (n - 1))])
        starts.append(np.array([a_guess, b_guess, c_guess, x0_try]))
    # Vary c over orders of magnitude
    for c_mult in [0.1, 1.0, 10.0]:
        starts.append(np.array([a_guess, b_guess, c_guess * c_mult, x0_guess]))
    # Random perturbations
    base_guess = np.array([a_guess, b_guess, c_guess, x0_guess])
    for _ in range(4):
        perturbed = base_guess * (1.0 + rng.uniform(-0.5, 0.5, size=4))
        perturbed[2] = max(perturbed[2], 1e-6)
        perturbed[3] = np.clip(perturbed[3], float(x.min()), float(x.max()))
        starts.append(perturbed)

    for p0 in starts:
        params = gradient_descent(np.array(p0, dtype=np.float64), x, y,
                                  learning_rate=1e-3, max_iters=5000,
                                  bounds_lo=bounds_lo, bounds_hi=bounds_hi)
        c = cost_function(params, x, y)
        if c < best_cost:
            best_cost = c
            best_params = params.copy()

    a_opt, b_opt, c_opt, x0_opt = best_params

    # ── Compute derived quantities ───────────────────────────────────
    cmc_value = float(x0_opt)
    plateau = float(a_opt + b_opt * np.log(1.0 + c_opt * x0_opt))

    # Goodness-of-fit: R²
    y_pred = _szyszkowski_continuous(x, a_opt, b_opt, c_opt, x0_opt)
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_sq = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    # ── Human-readable equation strings ──────────────────────────────
    b_sign = "+" if b_opt >= 0 else "−"
    eq_pre = f"γ = {a_opt:.4f} {b_sign} {abs(b_opt):.4f}·ln(1 + {c_opt:.4f}·x)"
    eq_post = f"γ = {plateau:.4f}"

    return {
        "cmc_value": cmc_value,
        "cmc_surface_tension": plateau,
        "a": float(a_opt),
        "b": float(b_opt),
        "c": float(c_opt),
        "equation": f"CMC ≈ {cmc_value:.4g}",
        "equation_pre_cmc": eq_pre,
        "equation_post_cmc": eq_post,
        "r_squared": float(r_sq),
        "description": (
            f"Szyszkowski-type model (gradient descent): "
            f"γ = a + b·ln(1 + c·x) for x < CMC, γ = constant for x ≥ CMC. "
            f"Breakpoint at x = {cmc_value:.4g} gives the CMC. "
            f"R² = {r_sq:.6f}."
        ),
    }
    
