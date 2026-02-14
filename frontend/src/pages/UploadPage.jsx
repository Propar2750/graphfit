import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import FileDropzone from "../components/FileDropzone";

const MODE_LABELS = {
  "straight-line": "Straight Line Fit (y = mx + c)",
  cmc: "Physical Exp. 1 — CMC (Concentration vs Surface Tension)",
};

export default function UploadPage() {
  const navigate = useNavigate();
  const { fittingMode, uploadedFile, previewUrl, setFile, setExtractedData } =
    useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guard: redirect if no mode is selected
  if (!fittingMode) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-600 mb-4">
          No fitting mode selected. Please go back and choose one.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleExtract = async () => {
    if (!uploadedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("mode", fittingMode);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || `Server error (${res.status})`
        );
      }

      const data = await res.json();
      setExtractedData(data);
      navigate("/review");
    } catch (err) {
      setError(
        err.message || "Failed to extract data from image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Mode badge */}
      <div className="mb-8 text-center">
        <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-4 py-1.5 rounded-full">
          {MODE_LABELS[fittingMode] || fittingMode}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">
        Upload Your Data Table
      </h1>
      <p className="text-slate-500 text-center mb-10">
        Take a photo or screenshot of your data table and upload it below. We&rsquo;ll extract the numbers automatically.
      </p>

      {/* Dropzone */}
      <FileDropzone onFileSelect={setFile} previewUrl={previewUrl} />

      {uploadedFile && (
        <p className="mt-3 text-sm text-slate-500 text-center">
          Selected: <span className="font-medium">{uploadedFile.name}</span>
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          &larr; Back
        </button>
        <button
          onClick={handleExtract}
          disabled={!uploadedFile || loading}
          className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-colors cursor-pointer ${
            uploadedFile && !loading
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting Data...
            </span>
          ) : (
            "Extract Data"
          )}
        </button>
      </div>
    </div>
  );
}
