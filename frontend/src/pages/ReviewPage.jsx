import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function ReviewPage() {
  const navigate = useNavigate();
  const {
    fittingMode,
    previewUrl,
    extractedData,
    setExtractedData,
    setResults,
  } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Guard: no extracted data
  if (!fittingMode || !extractedData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-600 mb-4">
          No extracted data to review. Please upload an image first.
        </p>
        <button
          onClick={() => navigate("/upload")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const { columns, rows } = extractedData;

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

  const handleFitCurve = async () => {
    // Validate: all cells must be valid numbers
    const points = [];
    for (let i = 0; i < rows.length; i++) {
      const x = parseFloat(rows[i][0]);
      const y = parseFloat(rows[i][1]);
      if (isNaN(x) || isNaN(y)) {
        setError(`Row ${i + 1} has invalid values. Please fix before fitting.`);
        return;
      }
      points.push([x, y]);
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: fittingMode, points }),
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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">
        Review Extracted Data
      </h1>
      <p className="text-slate-500 text-center mb-10">
        Check the data below and correct any values that were read incorrectly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* Image thumbnail */}
        {previewUrl && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Uploaded Image
            </h2>
            <img
              src={previewUrl}
              alt="Uploaded data table"
              className="w-full rounded-lg object-contain max-h-48"
            />
          </div>
        )}

        {/* Editable table */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 ${previewUrl ? "md:col-span-2" : "md:col-span-3"}`}>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Extracted Data
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-2 text-slate-400 text-left w-10">#</th>
                  {columns.map((col, ci) => (
                    <th key={ci} className="py-2 px-1">
                      <input
                        type="text"
                        value={col}
                        onChange={(e) => updateColumn(ci, e.target.value)}
                        className="w-full px-2 py-1 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </th>
                  ))}
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-100">
                    <td className="py-2 pr-2 text-slate-400">{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-1 px-1">
                        <input
                          type="number"
                          step="any"
                          value={cell === null || cell === undefined ? "" : cell}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                    ))}
                    <td className="py-1 text-center">
                      <button
                        onClick={() => deleteRow(ri)}
                        disabled={rows.length <= 1}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Delete row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigate("/upload")}
          className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          &larr; Back to Upload
        </button>
        <button
          onClick={handleFitCurve}
          disabled={loading}
          className={`px-8 py-2.5 rounded-lg font-semibold text-white transition-colors cursor-pointer ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
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
            "Fit Curve"
          )}
        </button>
      </div>
    </div>
  );
}
