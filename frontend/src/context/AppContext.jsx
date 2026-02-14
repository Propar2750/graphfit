import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [fittingMode, setFittingMode] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null); // { columns, rows }
  const [results, setResults] = useState(null); // { equation, description, points, graphImage, fitParams }

  const selectMode = (mode) => {
    setFittingMode(mode);
  };

  const setFile = (file) => {
    setUploadedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const reset = () => {
    setFittingMode(null);
    setUploadedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setResults(null);
  };

  return (
    <AppContext.Provider
      value={{
        fittingMode,
        uploadedFile,
        previewUrl,
        extractedData,
        results,
        selectMode,
        setFile,
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
