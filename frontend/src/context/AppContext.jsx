import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [fittingMode, setFittingMode] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Array of File objects
  const [previewUrls, setPreviewUrls] = useState([]); // Array of blob URLs
  const [extractedData, setExtractedData] = useState(null); // { columns, rows }
  const [results, setResults] = useState(null); // { equation, description, points, graphImage, fitParams }

  const selectMode = (mode) => {
    setFittingMode(mode);
  };

  const addFiles = (newFiles) => {
    const filesArray = Array.from(newFiles);
    setUploadedFiles((prev) => [...prev, ...filesArray]);
    const newUrls = filesArray.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removeFile = (index) => {
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setUploadedFiles([]);
    setPreviewUrls([]);
  };

  const reset = () => {
    setFittingMode(null);
    clearFiles();
    setExtractedData(null);
    setResults(null);
  };

  return (
    <AppContext.Provider
      value={{
        fittingMode,
        uploadedFiles,
        previewUrls,
        extractedData,
        results,
        selectMode,
        addFiles,
        removeFile,
        clearFiles,
        setExtractedData,
        setResults,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
