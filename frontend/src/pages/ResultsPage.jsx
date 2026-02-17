import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function ResultsPage() {
  const navigate = useNavigate();
  const { fittingMode, previewUrls, results, reset, wavesRopePreview, wavesSoundPreview } = useAppContext();

  const isWaves = fittingMode === "waves";

  // Guard: no data
  if (!fittingMode || !results) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-600 mb-6 text-lg">
          No analysis data available.
        </p>
        <button
          onClick={() => {
            reset();
            navigate("/");
          }}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleStartOver = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 animate-fade-in">
      {/* Success banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-sm font-medium text-emerald-700 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Analysis Complete
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
          Your Results
        </h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Here&rsquo;s the extracted data and fitted curve from your uploaded table{previewUrls && previewUrls.length > 1 ? "s" : ""}.
        </p>
      </div>

      {/* Images + Graph(s) */}
      {isWaves ? (
        /* ── Waves mode: show 2 graphs ── */
        <div className="space-y-6 animate-slide-up">
          {/* Graph 1 — Rope Waves (3 lines) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 group hover:shadow-md transition-shadow">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 L22 12" />
              </svg>
              Graph 1: Transverse Waves — λ vs 1/ν (3 Lines)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {wavesRopePreview && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Source Image</p>
                  <img src={wavesRopePreview} alt="Rope table" className="w-full rounded-xl object-contain max-h-56 border border-slate-100 bg-slate-50" />
                </div>
              )}
              <div className={wavesRopePreview ? "md:col-span-2" : "md:col-span-3"}>
                {results.ropeGraphImage ? (
                  <img src={results.ropeGraphImage} alt="Rope wave graph" className="w-full rounded-xl object-contain max-h-80 border border-slate-100 bg-slate-50" />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm border border-slate-100">Graph not available</div>
                )}
              </div>
            </div>
          </div>

          {/* Graph 2 — Sound Waves (1 line) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 group hover:shadow-md transition-shadow">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-600 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M18.364 5.636a9 9 0 010 12.728" />
              </svg>
              Graph 2: Longitudinal Waves — λ vs 1/ν (1 Line)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {wavesSoundPreview && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Source Image</p>
                  <img src={wavesSoundPreview} alt="Sound table" className="w-full rounded-xl object-contain max-h-56 border border-slate-100 bg-slate-50" />
                </div>
              )}
              <div className={wavesSoundPreview ? "md:col-span-2" : "md:col-span-3"}>
                {results.soundGraphImage ? (
                  <img src={results.soundGraphImage} alt="Sound wave graph" className="w-full rounded-xl object-contain max-h-80 border border-slate-100 bg-slate-50" />
                ) : (
                  <div className="w-full h-56 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm border border-slate-100">Graph not available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Standard mode: single graph ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
        {/* Uploaded images */}
        {previewUrls && previewUrls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 group hover:shadow-md transition-shadow">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Source Data
            </h2>
            <div className={`grid gap-2 ${previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {previewUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Uploaded table ${i + 1}`}
                  className="w-full rounded-xl object-contain max-h-72 border border-slate-100 bg-slate-50"
                />
              ))}
            </div>
          </div>
        )}

        {/* Fitted graph */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 group hover:shadow-md transition-shadow">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Fitted Graph
          </h2>
          {results.graphImage ? (
            <img
              src={results.graphImage}
              alt="Fitted graph"
              className="w-full rounded-xl object-contain max-h-72 border border-slate-100 bg-slate-50"
            />
          ) : (
            <div className="w-full h-72 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm border border-slate-100">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4" />
                </svg>
                Graph not available
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Equation card */}
      <div className="mt-6 relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 animate-slide-up-slow group hover:shadow-md transition-shadow">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Fitted Equation
        </h2>
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl px-6 py-4 mb-4 border border-indigo-100/50">
          <p className="text-xl sm:text-2xl font-mono font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent whitespace-pre-line">
            {results.equation}
          </p>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {results.description}
        </p>
      </div>

      {/* Data points table(s) */}
      {isWaves ? (
        <div className="mt-6 space-y-4">
          {/* Rope data points */}
          {results.ropePoints && results.ropePoints.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 animate-slide-up-slow group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-600 uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Rope Wave Data
                </h2>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{results.ropePoints.length} rows</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500">
                      <th className="py-3 px-4 font-medium">#</th>
                      {(results.ropeColumns && results.ropeColumns.length > 0
                        ? results.ropeColumns
                        : ["Group", "1/ν", "λ"]
                      ).map((col, j) => (<th key={j} className="py-3 px-4 font-medium">{col}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.ropePoints.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{i + 1}</td>
                        {row.map((val, j) => (<td key={j} className="py-2.5 px-4 font-mono text-slate-700">{val}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Sound data points */}
          {results.soundPoints && results.soundPoints.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 animate-slide-up-slow group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-600 uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Sound Wave Data
                </h2>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{results.soundPoints.length} rows</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500">
                      <th className="py-3 px-4 font-medium">#</th>
                      {(results.soundColumns && results.soundColumns.length > 0
                        ? results.soundColumns
                        : ["Frequency (Hz)", "Length (cm)"]
                      ).map((col, j) => (<th key={j} className="py-3 px-4 font-medium">{col}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.soundPoints.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-violet-50/30 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{i + 1}</td>
                        {row.map((val, j) => (<td key={j} className="py-2.5 px-4 font-mono text-slate-700">{val}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        results.points && results.points.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 animate-slide-up-slow group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Data Points
            </h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {results.points.length} rows
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500">
                  <th className="py-3 px-4 font-medium">#</th>
                  {(results.columns && results.columns.length > 0
                    ? results.columns
                    : results.points[0].map((_, j) => j === 0 ? "X" : `Y${results.points[0].length > 2 ? j : ""}`)
                  ).map((col, j) => (
                    <th key={j} className="py-3 px-4 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.points.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-xs">{i + 1}</td>
                    {row.map((val, j) => (
                      <td key={j} className="py-2.5 px-4 font-mono text-slate-700">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
      )}

      {/* Actions */}
      <div className="mt-10 text-center">
        <button
          onClick={handleStartOver}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start Over
        </button>
      </div>
    </div>
  );
}
