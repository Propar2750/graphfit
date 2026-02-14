"""
POST /api/extract — receives a data table image, returns extracted table data via Gemini Vision.
"""

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from services.ocr import extract_table_from_image

router = APIRouter()


@router.post("/extract")
async def extract(image: UploadFile = File(...), mode: str = Form("straight-line")):
    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image.")

    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = extract_table_from_image(
            image_bytes=image_bytes,
            mime_type=image.content_type,
            mode=mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "rate_limit" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="API rate limit exceeded. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {err_msg}")

    return result
