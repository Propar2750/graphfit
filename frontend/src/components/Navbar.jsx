import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const WORKFLOW_STEPS = [
  { path: "/", label: "Choose", num: 1 },
  { path: "/upload", label: "Upload", num: 2 },
  { path: "/review", label: "Review", num: 3 },
  { path: "/results", label: "Results", num: 4 },
];

const MODE_SHORT_LABELS = {
  "straight-line": "Straight Line",
  cmc: "CMC",
  "photoelectric-1-1": "Exp 1.1",
  "photoelectric-1-2": "Exp 1.2",
  "photoelectric-1-3": "Exp 1.3",
  "single-slit": "Exp 2",
  "newtons-rings": "Exp 3",
  "pohls-damped": "Exp 4.1",
  "pohls-forced": "Exp 4.2",
  polarization: "Exp 6",
  waves: "Exp 7",
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fittingMode, reset } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const isHome = location.pathname === "/";
  const isInWorkflow = ["/upload", "/review", "/results"].includes(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on click outside
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.path === location.pathname);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:shadow-indigo-300/60 group-hover:scale-105 transition-all">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21l3-3m0 0l3 3m-3-3V3m4 14l3-3m-3 3L11 11" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              GraphFit
            </span>
          </Link>

          {/* Center: Workflow breadcrumb (desktop, shown only during workflow) */}
          {isInWorkflow && fittingMode && (
            <div className="hidden md:flex items-center gap-1 text-sm">
              {WORKFLOW_STEPS.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isFuture = i > currentStepIndex;

                return (
                  <div key={step.path} className="flex items-center gap-1">
                    {i > 0 && (
                      <svg className={`w-3.5 h-3.5 mx-0.5 ${isCompleted || isCurrent ? "text-indigo-300" : "text-slate-200"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <button
                      onClick={() => {
                        if (step.path === "/") { reset(); navigate("/"); }
                        else if (isCompleted) navigate(step.path);
                      }}
                      disabled={isFuture}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        isCurrent
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : isCompleted
                            ? "text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
                            : "text-slate-300 cursor-default"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCompleted
                            ? "bg-indigo-500 text-white"
                            : isCurrent
                              ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                              : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          step.num
                        )}
                      </span>
                      <span className="hidden lg:inline">{step.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Right: Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isHome
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Home
            </Link>

            {isHome && (
              <a
                href="#modes"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                Experiments
              </a>
            )}

            {/* Mode pill */}
            {fittingMode && !isHome && (
              <span className="ml-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {MODE_SHORT_LABELS[fittingMode] || fittingMode}
              </span>
            )}

            <div className="w-px h-5 bg-slate-200 mx-1.5" />

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="GitHub"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden p-2 -mr-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <div
        ref={menuRef}
        className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 space-y-1 border-t border-slate-100">
          <Link
            to="/"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isHome
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>

          {isHome && (
            <a
              href="#modes"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Experiments
            </a>
          )}

          {/* Mobile workflow steps */}
          {isInWorkflow && fittingMode && (
            <>
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Workflow</p>
              </div>
              {WORKFLOW_STEPS.map((step, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isFuture = i > currentStepIndex;

                return (
                  <button
                    key={step.path}
                    onClick={() => {
                      if (step.path === "/") { reset(); navigate("/"); }
                      else if (isCompleted) navigate(step.path);
                    }}
                    disabled={isFuture}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                      isCurrent
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : isCompleted
                          ? "text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
                          : "text-slate-300 cursor-default"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCompleted
                          ? "bg-indigo-500 text-white"
                          : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.num
                      )}
                    </span>
                    {step.label}
                  </button>
                );
              })}
            </>
          )}

          {/* Mode badge (mobile) */}
          {fittingMode && !isHome && (
            <div className="px-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {MODE_SHORT_LABELS[fittingMode] || fittingMode}
              </span>
            </div>
          )}

          <div className="h-px bg-slate-100 mx-1 !my-2" />

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
