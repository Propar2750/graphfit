import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [fittingMode, setFittingMode] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Array of File objects
  const [previewUrls, setPreviewUrls] = useState([]); // Array of blob URLs
  const [extractedData, setExtractedData] = useState(null); // { columns, rows }
  const [results, setResults] = useState(null); // { equation, description, points, graphImage, fitParams }

  // Waves experiment — dual-table state
  const [wavesRopeFile, setWavesRopeFile] = useState(null);
  const [wavesRopePreview, setWavesRopePreview] = useState(null);
  const [wavesSoundFile, setWavesSoundFile] = useState(null);
  const [wavesSoundPreview, setWavesSoundPreview] = useState(null);
  const [wavesRopeData, setWavesRopeData] = useState(null); // { columns, rows }
  const [wavesSoundData, setWavesSoundData] = useState(null); // { columns, rows }

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

  const setWavesRopeFileWithPreview = (file) => {
    if (wavesRopePreview) URL.revokeObjectURL(wavesRopePreview);
    if (file) {
      setWavesRopeFile(file);
      setWavesRopePreview(URL.createObjectURL(file));
    } else {
      setWavesRopeFile(null);
      setWavesRopePreview(null);
    }
  };

  const setWavesSoundFileWithPreview = (file) => {
    if (wavesSoundPreview) URL.revokeObjectURL(wavesSoundPreview);
    if (file) {
      setWavesSoundFile(file);
      setWavesSoundPreview(URL.createObjectURL(file));
    } else {
      setWavesSoundFile(null);
      setWavesSoundPreview(null);
    }
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
    // Reset waves state
    if (wavesRopePreview) URL.revokeObjectURL(wavesRopePreview);
    if (wavesSoundPreview) URL.revokeObjectURL(wavesSoundPreview);
    setWavesRopeFile(null);
    setWavesRopePreview(null);
    setWavesSoundFile(null);
    setWavesSoundPreview(null);
    setWavesRopeData(null);
    setWavesSoundData(null);
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
        // Waves dual-table state
        wavesRopeFile,
        wavesRopePreview,
        wavesSoundFile,
        wavesSoundPreview,
        wavesRopeData,
        wavesSoundData,
        setWavesRopeFileWithPreview,
        setWavesSoundFileWithPreview,
        setWavesRopeData,
        setWavesSoundData,
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
