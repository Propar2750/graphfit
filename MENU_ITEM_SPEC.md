# Menu Item Specification — Adding New Fitting Modes

This document standardizes what every new menu item (fitting mode) must define across the frontend and backend. Follow this checklist when adding a new option to GraphFit.

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Menu Item   │ ──► │  Specialized OCR │ ──► │  Shared Fitting  │ ──► │ Specialized Plot │
│  (Frontend)  │     │  (per mode)      │     │  (least squares) │     │  (per mode)      │
└──────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
```

**Key design principle:** Multiple menu items can share the same underlying least-squares fitting method (e.g. linear regression), but each menu item has:
1. Its **own OCR prompt/strategy** (tailored to the expected table format).
2. Its **own plotting function** (axes labels, title, annotation, visual style).

---

## 1. Menu Item Definition (Frontend)

Each mode must be registered in the `FITTING_MODES` array in `frontend/src/pages/HomePage.jsx`.

| Field         | Type        | Required | Description |
|---------------|-------------|----------|-------------|
| `id`          | `string`    | ✅       | Unique kebab-case identifier. Used in API calls as the `mode` value. Examples: `"straight-line"`, `"cmc"`, `"beer-lambert"`. |
| `title`       | `string`    | ✅       | Short display name shown on the card. Example: `"Physical Exp. 1 — CMC"`. |
| `description` | `string`    | ✅       | 1–2 sentence explanation of what the fit does and when to use it. |
| `icon`        | `JSX`       | ✅       | An inline SVG icon (24×24 viewBox, `w-8 h-8` Tailwind class). Visually hint at the curve shape. |

### Template entry:

```jsx
{
  id: "my-new-mode",
  title: "Experiment Name — Method",
  description:
    "One or two sentences describing the fitting method and the type of data table the user should upload.",
  icon: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {/* SVG path(s) here */}
    </svg>
  ),
},
```

---

## 2. OCR Prompt (Backend — `services/ocr.py`)

Each mode needs a `column_hint` block inside `extract_table_from_image()`. This tells the vision model what kind of table to expect, improving extraction accuracy.

| Field          | Description |
|----------------|-------------|
| `column_hint`  | A string appended to the OCR prompt describing the expected column headers, units, and data shape for this experiment type. |

### What the column hint must specify:

1. **Expected number of columns** (usually 2, but could be more).
2. **Column semantics** — what each column represents (e.g., "wavelength in nm", "absorbance").
3. **Expected units** — so the model can interpret handwritten unit labels correctly.
4. **Any special data formats** — scientific notation, log-scale values, percentage signs, etc.

### Template:

```python
elif mode == "my-new-mode":
    column_hint = (
        "The table likely has columns for <X_variable> (e.g. <units>) "
        "and <Y_variable> (e.g. <units>). "
        "Values may be in <special_format> notation."
    )
```

---

## 3. Fitting Function (Backend — `services/fitting.py`)

Each mode needs a fitting function. **Many modes can reuse the same mathematical method** — the differentiation is in the function signature and the returned metadata, not necessarily the algorithm.

### Shared fitting methods reference:

| Method | Function | Use when... |
|--------|----------|-------------|
| Linear regression (y = mx + c) | `fit_straight_line()` | Data is expected to be linear. |
| Szyszkowski piecewise + plateau | `fit_cmc()` | Looking for a breakpoint/critical point in adsorption-type data. |
| *(Add more as needed)* | | |

### If your mode reuses an existing method:

Simply add a routing branch in `routes/fit.py` that delegates to the existing function:

```python
elif req.mode == "my-new-mode":
    fit_params = fit_straight_line(req.points)  # reuse linear regression
```

### If your mode needs a new method:

Create a new function in `services/fitting.py` following this contract:

```python
def fit_<mode_name>(points: list[list[float]]) -> dict:
    """
    Fit [description of model] to the data.

    Parameters
    ----------
    points : list of [x, y] pairs

    Returns
    -------
    dict with the following keys (all required):
    """
```

### Required return keys:

| Key            | Type    | Description |
|----------------|---------|-------------|
| `equation`     | `str`   | Human-readable equation string for display (e.g. `"y = 2.34x + 1.05"`). |
| `description`  | `str`   | 1–2 sentence explanation of the fit and R² value. |
| `r_squared`    | `float` | Coefficient of determination (0–1). |
| *(mode-specific params)* | `float` | Any fitted parameters needed by the plotting function (e.g. `m`, `c`, `cmc_value`). Name them clearly. |

---

## 4. Plotting Function (Backend — `services/plotting.py`)

Each mode needs its own branch inside `generate_graph()`. Even if two modes use the same fitting method, their plots should be tailored.

### What each mode's plot must define:

| Element | Description |
|---------|-------------|
| **X-axis label** | Descriptive label with units (e.g. `"Concentration (mol/L)"`). |
| **Y-axis label** | Descriptive label with units (e.g. `"Surface Tension (mN/m)"`). |
| **Title** | Bold title for the plot (e.g. `"Beer-Lambert Law Fit"`). |
| **Fitted curve** | Plot the fitted function over `x_smooth` with a distinct color. |
| **Annotation box** | Text box showing key results (equation, R², critical values). Position it so it doesn't overlap data. |
| **Legend** | Label each plotted element (data points, fit line, special markers). |
| **Special markers** | Any mode-specific markers (e.g. CMC breakpoint diamond, intercept markers). |

### Template:

```python
elif mode == "my-new-mode":
    # Extract fitted params
    m = fit_params["m"]
    c = fit_params["c"]

    # Fitted curve
    y_fit = m * x_smooth + c
    ax.plot(x_smooth, y_fit, color="#dc2626", linewidth=2,
            label=f"Fit: {fit_params['equation']}")

    # Labels
    ax.set_xlabel("X Variable (units)", fontsize=12)
    ax.set_ylabel("Y Variable (units)", fontsize=12)
    ax.set_title("My Experiment Fit", fontsize=14, fontweight="bold")

    # Annotation box
    ax.text(
        0.05, 0.95,
        f"{fit_params['equation']}\nR² = {fit_params['r_squared']:.6f}",
        transform=ax.transAxes, fontsize=10, verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="#eff6ff", edgecolor="#93c5fd"),
    )
```

---

## 5. Route Wiring (Backend — `routes/fit.py`)

Add the mode to the `if/elif` chain in the `/api/fit` endpoint:

```python
elif req.mode == "my-new-mode":
    fit_params = fit_my_new_mode(req.points)  # or reuse fit_straight_line()
```

Don't forget to import the fitting function at the top of [routes/fit.py](backend/routes/fit.py).

---

## 6. Checklist for Adding a New Mode

Use this checklist every time you add a new menu item:

- [ ] **Frontend — `HomePage.jsx`**: Add entry to `FITTING_MODES` array with `id`, `title`, `description`, `icon`.
- [ ] **Backend — `services/ocr.py`**: Add `elif mode == "<id>":` block with a specialized `column_hint`.
- [ ] **Backend — `services/fitting.py`**: Either reuse an existing fit function or create a new `fit_<mode>()` that returns the required keys.
- [ ] **Backend — `routes/fit.py`**: Add `elif req.mode == "<id>":` branch to dispatch to the correct fitting function.
- [ ] **Backend — `services/plotting.py`**: Add `elif mode == "<id>":` branch with tailored axes labels, title, curve rendering, and annotation.
- [ ] **Test**: Add test cases in `test_cmc_methods.py` (or a new test file) for the new fitting function.

---

## 7. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Mode ID | kebab-case | `"beer-lambert"` |
| Fitting function | `fit_<snake_case>()` | `fit_beer_lambert()` |
| OCR hint variable | inline string in `elif` block | — |
| Plot branch | `elif mode == "<id>":` | — |
| Frontend title | `"Exp. N — Short Name"` | `"Physical Exp. 2 — Beer-Lambert"` |

---

## 8. Example: Adding a "Beer-Lambert" Mode

### Step 1 — Frontend (`HomePage.jsx`)

```jsx
{
  id: "beer-lambert",
  title: "Physical Exp. 2 — Beer-Lambert",
  description:
    "Fit absorbance vs. concentration data to verify Beer-Lambert's law (A = εlc). Finds the molar absorptivity from the slope.",
  icon: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8" />
    </svg>
  ),
},
```

### Step 2 — OCR (`services/ocr.py`)

```python
elif mode == "beer-lambert":
    column_hint = (
        "The table likely has columns for concentration (e.g. mol/L or mM) "
        "and absorbance (dimensionless, typically 0–2). "
    )
```

### Step 3 — Fitting (`services/fitting.py`)

Beer-Lambert is linear (A = εlc), so **reuse `fit_straight_line()`** — no new function needed.

### Step 4 — Route (`routes/fit.py`)

```python
elif req.mode == "beer-lambert":
    fit_params = fit_straight_line(req.points)
```

### Step 5 — Plotting (`services/plotting.py`)

```python
elif mode == "beer-lambert":
    m = fit_params["m"]
    c = fit_params["c"]
    y_fit = m * x_smooth + c
    ax.plot(x_smooth, y_fit, color="#dc2626", linewidth=2,
            label=f"Fit: {fit_params['equation']}")
    ax.set_xlabel("Concentration (mol/L)", fontsize=12)
    ax.set_ylabel("Absorbance", fontsize=12)
    ax.set_title("Beer-Lambert Law Fit", fontsize=14, fontweight="bold")
    ax.text(
        0.05, 0.95,
        f"A = εlc\n{fit_params['equation']}\nR² = {fit_params['r_squared']:.6f}",
        transform=ax.transAxes, fontsize=10, verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="#fef3c7", edgecolor="#fbbf24"),
    )
```
