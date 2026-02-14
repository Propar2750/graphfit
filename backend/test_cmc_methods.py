"""
Compare fit_cmc (grid-search + curve_fit) vs fit_cmc_2 (multi-start gradient descent)
on synthetic Szyszkowski data with Gaussian noise.

Generates data from the true model:
    y = a + b·ln(1 + c·x)   for x < x0
    y = d (plateau)          for x ≥ x0
adds normal noise, then fits with both methods and reports accuracy.
"""

import time
import numpy as np
from services.fitting import fit_cmc, fit_cmc_2, _szyszkowski_continuous

# ── True model parameters ────────────────────────────────────────────
TRUE_A  = 72.0      # surface tension of pure water (mN/m)
TRUE_B  = -30.0     # negative: ST decreases with concentration
TRUE_C  = 500.0     # adsorption strength scale
TRUE_X0 = 0.008     # true CMC (mol/L)
TRUE_PLATEAU = TRUE_A + TRUE_B * np.log(1.0 + TRUE_C * TRUE_X0)

print("=" * 70)
print("TRUE MODEL PARAMETERS")
print("=" * 70)
print(f"  a  = {TRUE_A}")
print(f"  b  = {TRUE_B}")
print(f"  c  = {TRUE_C}")
print(f"  x0 = {TRUE_X0}  (true CMC)")
print(f"  plateau (d) = {TRUE_PLATEAU:.4f}")
print()

# ── Generate synthetic data ──────────────────────────────────────────
rng = np.random.default_rng(seed=123)

# Pre-CMC: 15 points logarithmically spaced from 0.0001 to CMC
x_pre = np.linspace(0.0001, TRUE_X0, 5, endpoint=False)
# Post-CMC: 10 points from CMC to 3× CMC
x_post = np.linspace(TRUE_X0, 3 * TRUE_X0, 3)

x_all = np.concatenate([x_pre, x_post])
y_true = _szyszkowski_continuous(x_all, TRUE_A, TRUE_B, TRUE_C, TRUE_X0)

# ── Test at several noise levels ─────────────────────────────────────
noise_levels = [0.1, 0.5, 1.0, 2.0]

for noise_std in noise_levels:
    print("=" * 70)
    print(f"NOISE LEVEL: σ = {noise_std} mN/m")
    print("=" * 70)

    # Add Gaussian noise
    y_noisy = y_true + rng.normal(0, noise_std, size=len(y_true))
    points = [[float(xi), float(yi)] for xi, yi in zip(x_all, y_noisy)]

    # ── Method 1: fit_cmc (grid-search + curve_fit) ──────────────────
    t0 = time.perf_counter()
    try:
        result1 = fit_cmc(points)
        dt1 = time.perf_counter() - t0
        cmc1 = result1["cmc_value"]
        r2_1 = result1["r_squared"]
        err1 = abs(cmc1 - TRUE_X0)
        pct1 = 100 * err1 / TRUE_X0
        print(f"\n  fit_cmc (grid-search + curve_fit)")
        print(f"    CMC found   : {cmc1:.6f}   (true: {TRUE_X0})")
        print(f"    Abs error   : {err1:.6f}   ({pct1:.2f}%)")
        print(f"    R²          : {r2_1:.8f}")
        print(f"    a={result1['a']:.4f}  b={result1['b']:.4f}  c={result1['c']:.4f}")
        print(f"    Time        : {dt1*1000:.1f} ms")
    except Exception as e:
        dt1 = time.perf_counter() - t0
        print(f"\n  fit_cmc FAILED: {e}  ({dt1*1000:.1f} ms)")

    # ── Method 2: fit_cmc_2 (multi-start gradient descent) ───────────
    t0 = time.perf_counter()
    try:
        result2 = fit_cmc_2(points)
        dt2 = time.perf_counter() - t0
        cmc2 = result2["cmc_value"]
        r2_2 = result2["r_squared"]
        err2 = abs(cmc2 - TRUE_X0)
        pct2 = 100 * err2 / TRUE_X0
        print(f"\n  fit_cmc_2 (multi-start gradient descent)")
        print(f"    CMC found   : {cmc2:.6f}   (true: {TRUE_X0})")
        print(f"    Abs error   : {err2:.6f}   ({pct2:.2f}%)")
        print(f"    R²          : {r2_2:.8f}")
        print(f"    a={result2['a']:.4f}  b={result2['b']:.4f}  c={result2['c']:.4f}")
        print(f"    Time        : {dt2*1000:.1f} ms")
    except Exception as e:
        dt2 = time.perf_counter() - t0
        print(f"\n  fit_cmc_2 FAILED: {e}  ({dt2*1000:.1f} ms)")

    print()

# ── One more test: different true parameters to check robustness ─────
print("=" * 70)
print("ROBUSTNESS TEST — Different true parameters")
print("=" * 70)

test_cases = [
    {"a": 50.0, "b": -15.0, "c": 1000.0, "x0": 0.005, "label": "Low-ST surfactant"},
    {"a": 72.0, "b": -40.0, "c": 200.0,  "x0": 0.02,  "label": "Strong adsorber"},
    {"a": 72.0, "b": -10.0, "c": 50.0,   "x0": 0.05,  "label": "Weak adsorber"},
]

for tc in test_cases:
    a_t, b_t, c_t, x0_t = tc["a"], tc["b"], tc["c"], tc["x0"]
    print(f"\n  Case: {tc['label']}  (a={a_t}, b={b_t}, c={c_t}, x0={x0_t})")

    x_pre = np.linspace(0.0001, x0_t, 15, endpoint=False)
    x_post = np.linspace(x0_t, 3 * x0_t, 10)
    x_all = np.concatenate([x_pre, x_post])
    y_true = _szyszkowski_continuous(x_all, a_t, b_t, c_t, x0_t)
    y_noisy = y_true + rng.normal(0, 0.5, size=len(y_true))
    points = [[float(xi), float(yi)] for xi, yi in zip(x_all, y_noisy)]

    for name, fn in [("fit_cmc", fit_cmc), ("fit_cmc_2", fit_cmc_2)]:
        t0 = time.perf_counter()
        try:
            res = fn(points)
            dt = time.perf_counter() - t0
            err = abs(res["cmc_value"] - x0_t)
            pct = 100 * err / x0_t
            print(f"    {name:12s}: CMC={res['cmc_value']:.6f}  err={pct:.2f}%  "
                  f"R²={res['r_squared']:.6f}  {dt*1000:.0f}ms")
        except Exception as e:
            dt = time.perf_counter() - t0
            print(f"    {name:12s}: FAILED — {e}  {dt*1000:.0f}ms")

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
