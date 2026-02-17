import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function ReviewPage() {
  const navigate = useNavigate();
  const {
    fittingMode,
    previewUrls,
    extractedData,
    setExtractedData,
    setResults,
    // Waves dual-table state
    wavesRopeData,
    wavesSoundData,
    wavesRopePreview,
    wavesSoundPreview,
    setWavesRopeData,
    setWavesSoundData,
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isWaves = fittingMode === "waves";

  // Guard: no extracted data
  if (!fittingMode || (isWaves ? (!wavesRopeData || !wavesSoundData) : !extractedData)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-600 mb-6 text-lg">
          No extracted data to review. Please upload an image first.
        </p>
        <button
          onClick={() => navigate("/upload")}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const { columns, rows } = isWaves ? { columns: [], rows: [] } : extractedData;

  // Standard mode edit helpers
  const updateColumn = (colIndex, value) => {
    const newCols = [...columns];
    newCols[colIndex] = value;
    setExtractedData({ ...extractedData, columns: newCols });
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const newRows = rows.map((row, ri) => {
      if (ri !== rowIndex) return row;
      const newRow = [...row];
      newRow[colIndex] = value === "" ? "" : Number(value);
      return newRow;
    });
    setExtractedData({ ...extractedData, rows: newRows });
  };

  const addRow = () => {
    const emptyRow = columns.map(() => "");
    setExtractedData({ ...extractedData, rows: [...rows, emptyRow] });
  };

  const deleteRow = (rowIndex) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== rowIndex);
    setExtractedData({ ...extractedData, rows: newRows });
  };

  // Waves mode edit helpers
  const updateWavesCell = (table, rowIndex, colIndex, value) => {
    const data = table === "rope" ? wavesRopeData : wavesSoundData;
    const setter = table === "rope" ? setWavesRopeData : setWavesSoundData;
    const newRows = data.rows.map((row, ri) => {
      if (ri !== rowIndex) return row;
      const newRow = [...row];
      newRow[colIndex] = value === "" ? "" : Number(value);
      return newRow;
    });
    setter({ ...data, rows: newRows });
  };

  const updateWavesColumn = (table, colIndex, value) => {
    const data = table === "rope" ? wavesRopeData : wavesSoundData;
    const setter = table === "rope" ? setWavesRopeData : setWavesSoundData;
    const newCols = [...data.columns];
    newCols[colIndex] = value;
    setter({ ...data, columns: newCols });
  };

  const addWavesRow = (table) => {
    const data = table === "rope" ? wavesRopeData : wavesSoundData;
    const setter = table === "rope" ? setWavesRopeData : setWavesSoundData;
    const emptyRow = data.columns.map(() => "");
    setter({ ...data, rows: [...data.rows, emptyRow] });
  };

  const deleteWavesRow = (table, rowIndex) => {
    const data = table === "rope" ? wavesRopeData : wavesSoundData;
    const setter = table === "rope" ? setWavesRopeData : setWavesSoundData;
    if (data.rows.length <= 1) return;
    const newRows = data.rows.filter((_, i) => i !== rowIndex);
    setter({ ...data, rows: newRows });
  };

  const handleFitCurve = async () => {
    setLoading(true);
    setError(null);

    if (isWaves) {
      // Validate and parse both tables
      const ropePoints = [];
      for (let i = 0; i < wavesRopeData.rows.length; i++) {
        const row = [];
        for (let j = 0; j < wavesRopeData.columns.length; j++) {
          const val = parseFloat(wavesRopeData.rows[i][j]);
          if (isNaN(val)) {
            setError(`Rope Table: Row ${i + 1}, column "${wavesRopeData.columns[j]}" has an invalid value.`);
            setLoading(false);
            return;
          }
          row.push(val);
        }
        ropePoints.push(row);
      }

      const soundPoints = [];
      for (let i = 0; i < wavesSoundData.rows.length; i++) {
        const row = [];
        for (let j = 0; j < wavesSoundData.columns.length; j++) {
          const val = parseFloat(wavesSoundData.rows[i][j]);
          if (isNaN(val)) {
            setError(`Sound Table: Row ${i + 1}, column "${wavesSoundData.columns[j]}" has an invalid value.`);
            setLoading(false);
            return;
          }
          row.push(val);
        }
        soundPoints.push(row);
      }

      try {
        const res = await fetch("/api/fit-waves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rope_points: ropePoints,
            rope_columns: wavesRopeData.columns,
            sound_points: soundPoints,
            sound_columns: wavesSoundData.columns,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error (${res.status})`);
        }

        const data = await res.json();
        setResults(data);
        navigate("/results");
      } catch (err) {
        setError(err.message || "Failed to fit waves. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard mode fitting
    const points = [];
    for (let i = 0; i < rows.length; i++) {
      const row = [];
      for (let j = 0; j < columns.length; j++) {
        const val = parseFloat(rows[i][j]);
        if (isNaN(val)) {
          setError(`Row ${i + 1}, column "${columns[j]}" has an invalid value. Please fix before fitting.`);
          setLoading(false);
          return;
        }
        row.push(val);
      }
      points.push(row);
    }

    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: fittingMode, points, columns }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      setResults(data);
      navigate("/results");
    } catch (err) {
      setError(err.message || "Failed to fit curve. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-indigo-600">Choose</span>
        </div>
        <div className="w-8 h-px bg-indigo-300" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-indigo-600">Upload</span>
        </div>
        <div className="w-8 h-px bg-indigo-300" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold ring-4 ring-indigo-100 shadow-lg shadow-indigo-200/50">
            3
          </div>
          <span className="text-sm font-bold text-indigo-700">Review</span>
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-2">
        Review Extracted Data
      </h1>
      <p className="text-slate-500 text-center mb-10 max-w-md mx-auto">
        Check the data below and correct any values that were read incorrectly.
      </p>

      {isWaves ? (
        /* ── Waves mode: two separate editable tables ── */
        <div className="space-y-8 mb-10">
          {/* Table 1 — Rope Waves */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              {wavesRopePreview && (
                <img src={wavesRopePreview} alt="Rope table" className="w-20 h-14 rounded-lg object-cover border border-slate-100" />
              )}
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-600 uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 L22 12" />
                  </svg>
                  Table 1: Rope Waves (3 lines)
                </h2>
                <p className="text-xs text-slate-400">Columns: group, 1/v (s), wavelength (m)</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 px-3 text-slate-400 text-left w-10 font-medium">#</th>
                    {wavesRopeData.columns.map((col, ci) => (
                      <th key={ci} className="py-3 px-2">
                        <input type="text" value={col} onChange={(e) => updateWavesColumn("rope", ci, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </th>
                    ))}
                    <th className="py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {wavesRopeData.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-2">
                          <input type="number" step="any" value={cell === null || cell === undefined ? "" : cell}
                            onChange={(e) => updateWavesCell("rope", ri, ci, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </td>
                      ))}
                      <td className="py-1.5 text-center">
                        <button onClick={() => deleteWavesRow("rope", ri)} disabled={wavesRopeData.rows.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all" title="Delete row">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => addWavesRow("rope")}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold cursor-pointer group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Row
            </button>
          </div>

          {/* Table 2 — Sound Waves */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              {wavesSoundPreview && (
                <img src={wavesSoundPreview} alt="Sound table" className="w-20 h-14 rounded-lg object-cover border border-slate-100" />
              )}
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-600 uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M18.364 5.636a9 9 0 010 12.728" />
                  </svg>
                  Table 2: Sound Waves (1 line)
                </h2>
                <p className="text-xs text-slate-400">Columns: frequency (Hz), air column length (cm)</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 px-3 text-slate-400 text-left w-10 font-medium">#</th>
                    {wavesSoundData.columns.map((col, ci) => (
                      <th key={ci} className="py-3 px-2">
                        <input type="text" value={col} onChange={(e) => updateWavesColumn("sound", ci, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                      </th>
                    ))}
                    <th className="py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {wavesSoundData.rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100 hover:bg-violet-50/30 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-2">
                          <input type="number" step="any" value={cell === null || cell === undefined ? "" : cell}
                            onChange={(e) => updateWavesCell("sound", ri, ci, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                        </td>
                      ))}
                      <td className="py-1.5 text-center">
                        <button onClick={() => deleteWavesRow("sound", ri)} disabled={wavesSoundData.rows.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all" title="Delete row">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => addWavesRow("sound")}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-semibold cursor-pointer group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Row
            </button>
          </div>
        </div>
      ) : (
        /* ── Standard mode: single editable table ── */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Image thumbnails */}
          {previewUrls && previewUrls.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 animate-slide-up">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Source Image{previewUrls.length > 1 ? "s" : ""}
              </h2>
              <div className={`grid gap-2 ${previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {previewUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Uploaded table ${i + 1}`}
                    className="w-full rounded-xl object-cover max-h-48 border border-slate-100" />
                ))}
              </div>
            </div>
          )}

          {/* Editable table */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 animate-slide-up ${previewUrls && previewUrls.length > 0 ? "md:col-span-2" : "md:col-span-3"}`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Extracted Data
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 px-3 text-slate-400 text-left w-10 font-medium">#</th>
                    {columns.map((col, ci) => (
                      <th key={ci} className="py-3 px-2">
                        <input type="text" value={col} onChange={(e) => updateColumn(ci, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                      </th>
                    ))}
                    <th className="py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100 hover:bg-indigo-50/30 transition-colors">
                      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-1.5 px-2">
                          <input type="number" step="any" value={cell === null || cell === undefined ? "" : cell}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />
                        </td>
                      ))}
                      <td className="py-1.5 text-center">
                        <button onClick={() => deleteRow(ri)} disabled={rows.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all" title="Delete row">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addRow}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Row
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-scale-in">
          <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate("/upload")}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Upload
        </button>
        <button
          onClick={handleFitCurve}
          disabled={loading}
          className={`px-8 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer flex items-center gap-2 ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fitting Curve...
            </span>
          ) : (
            <>
              Fit Curve
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
