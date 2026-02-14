import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const FITTING_MODES = [
  {
    id: "straight-line",
    title: "Straight Line",
    description:
      "Fit y = mx + c to your data. Ideal for direct proportional relationships.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20l16-16" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-400",
    bgLight: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    id: "cmc",
    title: "Chemistry — CMC",
    description:
      "Concentration vs. surface tension to find the Critical Micelle Concentration via two-segment regression.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18l8-10 8 2" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-400",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    id: "photoelectric-1-1",
    title: "Exp 1.1 — Photoelectric (V-I)",
    description:
      "Plot V_bias vs I for different wavelengths. Marks stopping potentials where photocurrent → 0.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18h4l2-6 4 8 2-4h4" />
      </svg>
    ),
    color: "from-amber-500 to-orange-400",
    bgLight: "bg-amber-50",
    textColor: "text-amber-600",
  },
  {
    id: "photoelectric-1-2",
    title: "Exp 1.2 — Photoelectric (h)",
    description:
      "Plot stopping voltage vs frequency. Linear fit slope = h/e gives Planck's constant.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17l16-12" />
        <circle cx="8" cy="14" r="1.5" fill="currentColor" />
        <circle cx="14" cy="9" r="1.5" fill="currentColor" />
      </svg>
    ),
    color: "from-rose-500 to-pink-400",
    bgLight: "bg-rose-50",
    textColor: "text-rose-600",
  },
  {
    id: "photoelectric-1-3",
    title: "Exp 1.3 — Photoelectric (Intensity)",
    description:
      "Plot V_bias vs I for different lamp–phototube separations to study intensity effects on photocurrent.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19h4l3-8 4 10 3-6h3" />
      </svg>
    ),
    color: "from-violet-500 to-purple-400",
    bgLight: "bg-violet-50",
    textColor: "text-violet-600",
  },
  {
    id: "single-slit",
    title: "Exp 2 — Single Slit Diffraction",
    description:
      "Plot intensity distribution as a function of θ. Fits sinc² diffraction pattern.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 20 Q7 20 9 14 Q11 4 12 4 Q13 4 15 14 Q17 20 22 20" />
      </svg>
    ),
    color: "from-indigo-500 to-blue-400",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-600",
  },
  {
    id: "newtons-rings",
    title: "Exp 3 — Newton's Rings",
    description:
      "Plot D² vs ring number n. Linear fit slope = 4Rλ to determine radius of curvature.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" strokeWidth={2} fill="none" />
        <circle cx="12" cy="12" r="6" strokeWidth={1.5} fill="none" />
        <circle cx="12" cy="12" r="9" strokeWidth={1} fill="none" />
      </svg>
    ),
    color: "from-cyan-500 to-sky-400",
    bgLight: "bg-cyan-50",
    textColor: "text-cyan-600",
  },
  {
    id: "pohls-damped",
    title: "Exp 4.1 — Pohl's Pendulum (Damped)",
    description:
      "Plot ln(φ) vs t for various damping currents. Linear slopes give damping constants δ.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12 Q5 4 8 12 Q10 17 12 12 Q13.5 8.5 15 12 Q16 14 17 12 Q18 11 19 12 L22 12" />
      </svg>
    ),
    color: "from-fuchsia-500 to-pink-400",
    bgLight: "bg-fuchsia-50",
    textColor: "text-fuchsia-600",
  },
  {
    id: "pohls-forced",
    title: "Exp 4.2 — Pohl's Pendulum (Forced)",
    description:
      "Plot amplitude vs forcing frequency for various damping values. Identifies resonance peaks.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 20 Q8 20 10 10 Q12 2 14 10 Q16 20 21 20" />
      </svg>
    ),
    color: "from-orange-500 to-amber-400",
    bgLight: "bg-orange-50",
    textColor: "text-orange-600",
  },
  {
    id: "polarization",
    title: "Exp 6 — Optical Rotation",
    description:
      "Plot θ (rotation angle) vs concentration c. Linear fit gives specific rotation [α]·l.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19l14-14" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5l3 3M12 5l-3 3" />
      </svg>
    ),
    color: "from-teal-500 to-emerald-400",
    bgLight: "bg-teal-50",
    textColor: "text-teal-600",
  },
  {
    id: "waves",
    title: "Exp 7 — Transverse & Longitudinal Waves",
    description:
      "Plot λ vs 1/ν. Linear fit slope gives phase velocity or speed of sound.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 L22 12" />
      </svg>
    ),
    color: "from-sky-500 to-indigo-400",
    bgLight: "bg-sky-50",
    textColor: "text-sky-600",
  },
];

const STEPS = [
  {
    step: "1",
    label: "Choose a Fit",
    desc: "Pick the type of curve fitting you need from the modes below.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    step: "2",
    label: "Upload Data",
    desc: "Drop in a photo or screenshot of your handwritten / printed data table.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    step: "3",
    label: "Get Results",
    desc: "See the extracted data, fitted graph, equation, and parameters instantly.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 text-center animate-fade-in">
        {/* Decorative blobs */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/40 via-violet-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-sm font-medium text-indigo-700 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Powered by ML
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              Graph
            </span>
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Fit
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Upload a picture of your data table, and we&rsquo;ll extract the numbers,
            fit the best curve, and display the graph with its equation &mdash; instantly.
          </p>

          <a
            href="#modes"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 hover:translate-y-[-1px] active:translate-y-0 transition-all"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 animate-slide-up">
        <div className="text-center mb-12">
          <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">
            Simple Workflow
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900">
            How It Works
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {STEPS.map((item, i) => (
            <div
              key={item.step}
              className={`relative group rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all stagger-${i + 1} animate-slide-up`}
            >
              {/* Connector line */}
              {i < 2 && (
                <div className="hidden sm:block absolute top-1/2 -right-3 w-6 h-px bg-slate-300 z-10" />
              )}

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-200/40 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-1.5">
                <span className="text-indigo-400 mr-1">0{item.step}</span> {item.label}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fitting mode selection */}
      <section id="modes" className="py-16 scroll-mt-20">
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">
            Experiments
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900">
            Select a Fitting Mode
          </p>
          <p className="mt-3 text-slate-500 max-w-lg mx-auto">
            Choose the experiment type that matches your data. Each mode uses a tailored fitting algorithm.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FITTING_MODES.map((mode, i) => (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className={`group relative text-left rounded-2xl p-6 bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer stagger-${i + 1} animate-scale-in`}
            >
              {/* Gradient accent on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />

              <div className="relative">
                <div className={`w-11 h-11 rounded-xl ${mode.bgLight} ${mode.textColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {mode.icon}
                </div>

                <h3 className="text-base font-bold text-slate-800 mb-2 group-hover:text-slate-900">
                  {mode.title}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                  {mode.description}
                </p>

                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Select
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
