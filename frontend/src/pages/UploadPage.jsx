import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import FileDropzone from "../components/FileDropzone";

const MODE_LABELS = {
  "straight-line": "Straight Line Fit (y = mx + c)",
  cmc: "Chemistry — CMC (Concentration vs Surface Tension)",
  "photoelectric-1-1": "Exp 1.1 — Photoelectric Effect (V-I Curves)",
  "photoelectric-1-2": "Exp 1.2 — Photoelectric Effect (h Determination)",
  "photoelectric-1-3": "Exp 1.3 — Photoelectric Effect (Intensity Study)",
  "single-slit": "Exp 2 — Single Slit Diffraction",
  "newtons-rings": "Exp 3 — Newton's Rings",
  "pohls-damped": "Exp 4.1 — Pohl's Pendulum (Damped Oscillation)",
  "pohls-forced": "Exp 4.2 — Pohl's Pendulum (Forced Oscillation)",
  polarization: "Exp 6 — Optical Rotation",
  waves: "Exp 7 — Transverse & Longitudinal Waves",
};

export default function UploadPage() {
  const navigate = useNavigate();
  const { fittingMode, uploadedFiles, previewUrls, addFiles, removeFile, setExtractedData } =
    useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(""); // progress text while extracting

  // Guard: redirect if no mode is selected
  if (!fittingMode) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-slate-600 mb-6 text-lg">
          No fitting mode selected. Please go back and choose one.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleExtract = async () => {
    if (uploadedFiles.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress("");

    try {
      let mergedColumns = null;
      let mergedRows = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        setProgress(`Extracting image ${i + 1} of ${uploadedFiles.length}...`);

        const formData = new FormData();
        formData.append("image", uploadedFiles[i]);
        formData.append("mode", fittingMode);

        const res = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.detail || `Server error on image ${i + 1} (${res.status})`
          );
        }

        const data = await res.json();

        // Use columns from first image; merge rows from all
        if (!mergedColumns) {
          mergedColumns = data.columns;
        }
        mergedRows = [...mergedRows, ...data.rows];
      }

      setExtractedData({ columns: mergedColumns, rows: mergedRows });
      navigate("/review");
    } catch (err) {
      setError(
        err.message || "Failed to extract data from images. Please try again."
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-200/50">
            1
          </div>
          <span className="text-sm font-medium text-indigo-700">Choose</span>
        </div>
        <div className="w-8 h-px bg-indigo-300" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-200/50 ring-4 ring-indigo-100">
            2
          </div>
          <span className="text-sm font-bold text-indigo-700">Upload</span>
        </div>
        <div className="w-8 h-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-sm font-bold">
            3
          </div>
          <span className="text-sm font-medium text-slate-400">Results</span>
        </div>
      </div>

      {/* Mode badge */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full border border-indigo-100">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {MODE_LABELS[fittingMode] || fittingMode}
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-2">
        Upload Your Data Tables
      </h1>
      <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
        Upload one or more photos / screenshots of your data tables. We&rsquo;ll extract and merge the numbers automatically.
      </p>

      {/* Dropzone */}
      <FileDropzone
        onFilesAdd={addFiles}
        previewUrls={previewUrls}
        onRemoveFile={removeFile}
      />

      {uploadedFiles.length > 0 && (
        <p className="mt-3 text-sm text-slate-500 text-center">
          <span className="font-semibold text-indigo-600">{uploadedFiles.length}</span> image{uploadedFiles.length > 1 ? "s" : ""} selected
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-scale-in">
          <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={handleExtract}
          disabled={uploadedFiles.length === 0 || loading}
          className={`px-8 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer flex items-center gap-2 ${
            uploadedFiles.length > 0 && !loading
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-slate-300 cursor-not-allowed shadow-none"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progress || "Extracting Data..."}
            </span>
          ) : (
            <>
              Extract Data
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
