"""
OCR service — uses Groq Vision API (Llama 4 Scout) to extract table data from an image.
"""

import base64
import json
import os
import re

from groq import Groq


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env\n"
            "Get a free key at https://console.groq.com/keys"
        )
    return Groq(api_key=api_key)


def extract_table_from_image(image_bytes: bytes, mime_type: str, mode: str) -> dict:
    """
    Send the image to Groq Vision and ask it to extract the data table.

    Returns:
        { "columns": ["col1", "col2"], "rows": [[v1, v2], ...] }

    Raises:
        ValueError if no table could be detected.
    """
    client = _get_client()

    if mode == "cmc":
        column_hint = (
            "The table likely has columns for concentration (e.g. mol/L or mM) "
            "and surface tension (e.g. mN/m or dyne/cm). "
        )
    elif mode == "straight-line":
        column_hint = (
            "The table likely has two numeric columns representing X and Y values. "
        )
    elif mode == "photoelectric-1-1":
        column_hint = (
            "The table has V_bias (voltage) in the first column and photocurrent I "
            "for different wavelengths in subsequent columns. Column headers may "
            "include wavelength labels like λ=365nm, λ=405nm, etc. "
        )
    elif mode == "photoelectric-1-2":
        column_hint = (
            "The table has two columns: frequency (ν, in Hz or THz) "
            "and stopping potential or stopping voltage (V_stop, in Volts). "
        )
    elif mode == "photoelectric-1-3":
        column_hint = (
            "The table has V_bias (voltage) in the first column and photocurrent I "
            "for different lamp-phototube separations in subsequent columns. "
            "Column headers may include distance labels like d=10cm, d=15cm, etc. "
        )
    elif mode == "single-slit":
        column_hint = (
            "The table has two columns: angle θ (theta, in degrees or radians) "
            "and intensity I (arbitrary units or measured units). "
            "θ may be negative for positions on one side of the central maximum. "
        )
    elif mode == "newtons-rings":
        column_hint = (
            "The table has two columns: ring number n (integer) and "
            "diameter D_n of the ring (in cm or mm). "
            "D_n may also be labeled as 'diameter' or 'D'. "
        )
    elif mode == "pohls-damped":
        column_hint = (
            "The table has time t in the first column and oscillation amplitude φ "
            "(phi) for different damping currents in subsequent columns. "
            "Column headers may include damping current labels like I_d=0.2A, etc. "
        )
    elif mode == "pohls-forced":
        column_hint = (
            "The table has forcing frequency (in Hz or rad/s) in the first column "
            "and oscillation amplitude for different damping values in subsequent "
            "columns. Column headers may include damping labels. "
        )
    elif mode == "polarization":
        column_hint = (
            "The table has two columns: concentration c (e.g. g/mL or mol/L) "
            "and rotation angle θ (theta, in degrees). "
        )
    elif mode == "waves-rope":
        column_hint = (
            "This is Table 1: Phase velocity of rope waves (transverse waves). "
            "The table has 3 groups of rows (typically 4 rows each), separated "
            "by different tension/mass values like (50+50)g, (100+50)g, (150+50)g. "
            "For each row, extract ONLY these values: "
            "  - A group number (1, 2, or 3) based on which tension group the row belongs to "
            "  - The '1/v' or '1/ν' column value (inverse frequency, in seconds) "
            "  - The 'λ' or 'λ = 2L/n' column value (wavelength, dimensionless or in meters) "
            "Return columns: ['group', 'inv_freq', 'wavelength']. "
            "Group 1 = first/top group, Group 2 = second/middle group, Group 3 = third/bottom group. "
            "There should be about 12 rows total (4 per group). "
        )
    elif mode == "waves-sound":
        column_hint = (
            "This is Table 2: Velocity of sound in air (longitudinal waves). "
            "The table has columns including natural frequency of tuning fork ν (in Hz) "
            "and length of air column L (in cm). Other columns like 1/v, mode number n, "
            "λ, and velocity may be empty/unfilled. "
            "Extract ONLY the frequency (ν in Hz) and the length of air column (L in cm) "
            "for each row that has data. Ignore empty columns. "
            "Return columns: ['frequency_hz', 'length_cm']. "
            "There should be about 6 rows. "
        )
    else:
        column_hint = ""

    prompt = f"""You are a precise data-extraction assistant.

Look at this image. It should contain a data table (handwritten or printed).

{column_hint}

Your task:
1. Identify every column header and every row of numeric data in the table.
2. Return ONLY valid JSON in this exact format (no markdown, no explanation):

{{"columns": ["column_name_1", "column_name_2"], "rows": [[number, number], [number, number], ...]}}

Rules:
- Every value in "rows" must be a number (int or float), not a string.
- If a value looks like scientific notation (e.g. 2.5×10⁻³), convert it to a decimal (0.0025).
- Preserve the order of rows as they appear in the table.
- If you cannot find a data table in the image, return exactly: {{"error": "No data table found"}}
"""

    # Encode image as base64 data URL for the vision API
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{mime_type};base64,{b64_image}"

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                ],
            }
        ],
        temperature=0.1,
        max_completion_tokens=2048,
    )

    content = response.choices[0].message.content
    if content is None:
        raise ValueError("Vision model returned an empty response.")
    raw_text = content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        raise ValueError(
            f"Vision model returned invalid JSON. Raw response:\n{raw_text}"
        )

    if "error" in data:
        raise ValueError(data["error"])

    # Validate structure
    if "columns" not in data or "rows" not in data:
        raise ValueError(
            "Response missing 'columns' or 'rows' fields."
        )

    if not isinstance(data["rows"], list) or len(data["rows"]) == 0:
        raise ValueError("No data rows found in the table.")

    # Coerce all values to float
    cleaned_rows = []
    for row in data["rows"]:
        cleaned_row = []
        for val in row:
            try:
                cleaned_row.append(float(val))
            except (ValueError, TypeError):
                cleaned_row.append(None)
        cleaned_rows.append(cleaned_row)

    data["rows"] = cleaned_rows
    return data
