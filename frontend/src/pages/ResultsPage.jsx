import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function ResultsPage() {
  const navigate = useNavigate();
  const { fittingMode, previewUrl, results, reset } = useAppContext();

  // Guard: no data
  if (!fittingMode || !results) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-600 mb-4">
          No analysis data available. Start from the beginning.
        </p>
        <button
          onClick={() => {
            reset();
            navigate("/");
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">
        Analysis Results
      </h1>
      <p className="text-slate-500 text-center mb-10">
        Here&rsquo;s the data we extracted from your table and the fitted curve.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Uploaded image */}
        {previewUrl && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Uploaded Data Table
            </h2>
            <img
              src={previewUrl}
              alt="Uploaded data table"
              className="w-full rounded-lg object-contain max-h-72"
            />
          </div>
        )}

        {/* Fitted graph */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Fitted Graph
          </h2>
          {results.graphImage ? (
            <img
              src={results.graphImage}
              alt="Fitted graph"
              className="w-full rounded-lg object-contain max-h-72"
            />
          ) : (
            <div className="w-full h-72 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
              Graph not available
            </div>
          )}
        </div>
      </div>

      {/* Equation card */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Fitted Equation
        </h2>
        <p className="text-2xl font-mono font-bold text-blue-700 mb-3">
          {results.equation}
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          {results.description}
        </p>
      </div>

      {/* Data points table */}
      {results.points && results.points.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Data Points
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">
                    {fittingMode === "cmc" ? "Concentration" : "X"}
                  </th>
                  <th className="py-2">
                    {fittingMode === "cmc" ? "Surface Tension" : "Y"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.points.map(([x, y], i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono">{x}</td>
                    <td className="py-2 font-mono">{y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 text-center">
        <button
          onClick={handleStartOver}
          className="px-8 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
