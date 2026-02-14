import { useCallback, useState, useRef } from "react";

export default function FileDropzone({ onFilesAdd, previewUrls, onRemoveFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        onFilesAdd(files);
      }
    },
    [onFilesAdd]
  );

  const handleChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        onFilesAdd(files);
      }
      // Reset so the same files can be re-selected
      e.target.value = "";
    },
    [onFilesAdd]
  );

  const hasFiles = previewUrls && previewUrls.length > 0;

  return (
    <div className="w-full space-y-4">
      {/* Thumbnail grid */}
      {hasFiles && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previewUrls.map((url, i) => (
            <div
              key={i}
              className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow animate-scale-in"
            >
              <img
                src={url}
                alt={`Upload ${i + 1}`}
                className="w-full h-28 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 backdrop-blur-sm text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:bg-red-500 shadow-lg"
                title="Remove image"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs text-center py-1.5 font-medium">
                Image {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / add more area */}
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
          hasFiles ? "h-32" : "h-64"
        } ${
          isDragging
            ? "border-indigo-400 bg-indigo-50 scale-[1.02] shadow-lg shadow-indigo-100/50"
            : "border-slate-200 bg-white hover:bg-indigo-50/30 hover:border-indigo-300"
        }`}
      >
        {/* Decorative corner accents */}
        {!hasFiles && (
          <>
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-indigo-200 rounded-tl-md" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-indigo-200 rounded-tr-md" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-indigo-200 rounded-bl-md" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-indigo-200 rounded-br-md" />
          </>
        )}

        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging
              ? "bg-indigo-100 text-indigo-600"
              : "bg-slate-100 text-slate-400"
          } ${hasFiles ? "w-10 h-10 rounded-xl" : ""}`}>
            <svg
              className={hasFiles ? "w-5 h-5" : "w-7 h-7"}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className={`font-semibold ${isDragging ? "text-indigo-600" : "text-slate-700"} ${hasFiles ? "text-sm" : "text-base"}`}>
              {isDragging
                ? "Drop images here"
                : hasFiles
                  ? "Add more images"
                  : "Drag & drop your data table images"
              }
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFiles ? "or click to browse" : "PNG, JPG, or HEIC — or click to browse"}
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
