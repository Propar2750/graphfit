import { useState, useRef, useCallback, useEffect } from "react";

/**
 * CameraCapture — modal overlay that requests camera permission,
 * shows a live video feed, and lets the user take a photo.
 *
 * Props:
 *   onCapture(file: File)  — called with the captured image as a File
 *   onClose()              — called when the user cancels / closes the modal
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("requesting"); // requesting | active | captured | error
  const [errorMsg, setErrorMsg] = useState("");
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // environment (back) | user (front)

  // Start camera stream
  const startCamera = useCallback(async (facing) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setStatus("requesting");
    setErrorMsg("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("active");
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera found on this device.");
      } else if (err.name === "OverconstrainedError") {
        // Fallback: try without facing mode constraint
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = fallback;
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            await videoRef.current.play();
          }
          setStatus("active");
          return;
        } catch {
          setErrorMsg("Could not access camera.");
        }
      } else {
        setErrorMsg(err.message || "Could not access camera.");
      }
      setStatus("error");
    }
  }, []);

  // Init on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error");
      setErrorMsg("Camera API is not supported in this browser. Try using Chrome or Safari.");
      return;
    }
    startCamera(facingMode);

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Flip camera
  const handleFlip = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (status === "active") startCamera(next);
  }, [facingMode, status, startCamera]);

  // Capture frame
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setStatus("captured");

        // Pause the video
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      },
      "image/jpeg",
      0.92
    );
  }, []);

  // Accept captured photo
  const handleAccept = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.92
    );
  }, [onCapture]);

  // Retake
  const handleRetake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    startCamera(facingMode);
  }, [capturedUrl, facingMode, startCamera]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close camera"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
          {status === "requesting" && (
            <div className="text-center text-white/80">
              <svg className="animate-spin w-8 h-8 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm">Requesting camera access...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center text-white/80 px-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
                </svg>
              </div>
              <p className="text-sm mb-4">{errorMsg}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${status === "active" ? "block" : "hidden"}`}
          />

          {status === "captured" && capturedUrl && (
            <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
          )}

          {/* Corner guides (active state) */}
          {status === "active" && (
            <>
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 px-4 py-4 bg-slate-800/80">
          {status === "active" && (
            <>
              {/* Flip camera */}
              <button
                onClick={handleFlip}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Flip camera"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Shutter */}
              <button
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 active:scale-90 transition-all cursor-pointer shadow-lg shadow-white/20 flex items-center justify-center ring-4 ring-white/30"
                title="Take photo"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-300" />
              </button>

              {/* Cancel */}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}

          {status === "captured" && (
            <>
              {/* Retake */}
              <button
                onClick={handleRetake}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retake
              </button>

              {/* Accept */}
              <button
                onClick={handleAccept}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Use Photo
              </button>
            </>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
