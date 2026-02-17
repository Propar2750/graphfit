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
  const {
    fittingMode,
    uploadedFiles,
    previewUrls,
    addFiles,
    removeFile,
    setExtractedData,
    // Waves dual-table state
    wavesRopeFile,
    wavesRopePreview,
    wavesSoundFile,
    wavesSoundPreview,
    setWavesRopeFileWithPreview,
    setWavesSoundFileWithPreview,
    setWavesRopeData,
    setWavesSoundData,
  } = useAppContext();

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
    // Waves mode: dual-image extraction
    if (fittingMode === "waves") {
      if (!wavesRopeFile || !wavesSoundFile) return;

      setLoading(true);
      setError(null);
      setProgress("");

      try {
        // Extract rope table (Table 1)
        setProgress("Extracting Table 1 (Rope Waves)...");
        const ropeForm = new FormData();
        ropeForm.append("image", wavesRopeFile);
        ropeForm.append("mode", "waves-rope");

        const ropeRes = await fetch("/api/extract", {
          method: "POST",
          body: ropeForm,
        });

        if (!ropeRes.ok) {
          const errData = await ropeRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error on rope table (${ropeRes.status})`);
        }
        const ropeData = await ropeRes.json();
        setWavesRopeData(ropeData);

        // Extract sound table (Table 2)
        setProgress("Extracting Table 2 (Sound Waves)...");
        const soundForm = new FormData();
        soundForm.append("image", wavesSoundFile);
        soundForm.append("mode", "waves-sound");

        const soundRes = await fetch("/api/extract", {
          method: "POST",
          body: soundForm,
        });

        if (!soundRes.ok) {
          const errData = await soundRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error on sound table (${soundRes.status})`);
        }
        const soundData = await soundRes.json();
        setWavesSoundData(soundData);

        navigate("/review");
      } catch (err) {
        setError(err.message || "Failed to extract data. Please try again.");
      } finally {
        setLoading(false);
        setProgress("");
      }
      return;
    }

    // Standard mode: single/multi-image extraction
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
        {fittingMode === "waves"
          ? "Upload two photos: one for the Rope Wave table (Table 1) and one for the Sound Wave table (Table 2)."
          : "Upload one or more photos / screenshots of your data tables. We\u2019ll extract and merge the numbers automatically."}
      </p>

      {/* Waves mode: dual dropzones */}
      {fittingMode === "waves" ? (
        <div className="space-y-8">
          {/* Table 1 — Rope Wave */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 L22 12" />
              </svg>
              Table 1: Phase Velocity of Rope Waves
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Upload the photo of Table 1 (transverse waves — 3 tension groups). This graph will have 3 lines.
            </p>
            {wavesRopePreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-white shadow-sm w-48 mx-auto">
                <img src={wavesRopePreview} alt="Rope table" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => setWavesRopeFileWithPreview(null)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 backdrop-blur-sm text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-red-500"
                  title="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all">
                <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-slate-400">Click to upload Table 1 image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setWavesRopeFileWithPreview(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Table 2 — Sound Wave */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M18.364 5.636a9 9 0 010 12.728" />
              </svg>
              Table 2: Velocity of Sound in Air
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Upload the photo of Table 2 (longitudinal waves — frequency vs air column length). This graph will have 1 line.
            </p>
            {wavesSoundPreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-white shadow-sm w-48 mx-auto">
                <img src={wavesSoundPreview} alt="Sound table" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => setWavesSoundFileWithPreview(null)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 backdrop-blur-sm text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-red-500"
                  title="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-violet-50/30 hover:border-violet-300 transition-all">
                <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-slate-400">Click to upload Table 2 image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setWavesSoundFileWithPreview(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Standard dropzone */}
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
        </>
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
          disabled={
            loading ||
            (fittingMode === "waves"
              ? !wavesRopeFile || !wavesSoundFile
              : uploadedFiles.length === 0)
          }
          className={`px-8 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer flex items-center gap-2 ${
            !loading &&
            (fittingMode === "waves"
              ? wavesRopeFile && wavesSoundFile
              : uploadedFiles.length > 0)
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
