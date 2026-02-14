import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const FITTING_MODES = [
  {
    id: "straight-line",
    title: "Straight Line",
    description:
      "Fit a linear equation y = mx + c to your graph data. Ideal for data that follows a direct proportional relationship.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20l16-16" />
      </svg>
    ),
  },
  {
    id: "cmc",
    title: "Physical Exp. 1 — CMC",
    description:
      "Fit a concentration vs. surface tension graph to determine the Critical Micelle Concentration (CMC). Two-segment linear regression identifies the breakpoint.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18l8-10 8 2" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { selectMode, reset } = useAppContext();

  const handleSelect = (modeId) => {
    reset();
    selectMode(modeId);
    navigate("/upload");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
          GraphFit
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload a picture of your data table, and our tool will extract the
          numbers, fit the best curve, and display the fitted graph along with
          the equation — all powered by machine learning.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { step: "1", label: "Choose a Fit", desc: "Pick the type of curve fitting you need." },
            { step: "2", label: "Upload Data", desc: "Drop in a photo of your data table." },
            { step: "3", label: "Get Results", desc: "See the extracted data, fitted graph, and equation." },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                {item.step}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{item.label}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fitting mode selection */}
      <section>
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
          Select a Fitting Mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FITTING_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className="group text-left bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3 text-blue-600 group-hover:text-blue-700">
                {mode.icon}
                <h3 className="text-lg font-semibold">{mode.title}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {mode.description}
              </p>
              <div className="mt-4 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Select &rarr;
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
