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

    raw_text = response.choices[0].message.content.strip()

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
