'use client';

import { useState } from "react";
import FileUploader from "../components/FileUploader";
import PDFProcessor from "../components/PDFProcessor";
import SimilarityChecker from "../components/SimilarityChecker";
import { ProcessedResult } from "../components/PDFProcessor";
import { SimilarityResult } from "../components/SimilarityChecker";
import { mockMasterList } from "../utils/mockData";

type AppStep = 'upload' | 'process' | 'similarity' | 'complete';

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedResult[]>([]);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [masterList] = useState<string[]>(mockMasterList); // Use mock data instead of requiring upload
  const [step, setStep] = useState<AppStep>('upload');

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStep('process');
  };

  const handleProcessingComplete = (results: ProcessedResult[]) => {
    setProcessedFiles(results);
    setStep('similarity');
  };

  const handleSimilarityChecked = (results: SimilarityResult[]) => {
    setSimilarityResults(results);
    setStep('complete');
  };

  const handleReset = () => {
    setFiles([]);
    setProcessedFiles([]);
    setSimilarityResults([]);
    setStep('upload');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          PDF <span className="text-purple-400">Validator</span>
        </h1>
        
        {step === 'upload' && (
          <FileUploader 
            onFilesSelected={handleFilesSelected}
          />
        )}
        
        {step === 'process' && files.length > 0 && (
          <PDFProcessor 
            files={files} 
            onProcessingComplete={handleProcessingComplete} 
          />
        )}
        
        {step === 'similarity' && processedFiles.length > 0 && (
          <SimilarityChecker 
            processedFiles={processedFiles} 
            masterList={masterList}
            onSimilarityChecked={handleSimilarityChecked}
          />
        )}

        {step === 'complete' && (
          <div className="w-full max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Processing Complete!</h2>
            <p className="mb-6">All PDF files have been processed and the report has been downloaded.</p>
            
            <div className="bg-gray-800 p-6 rounded-xl mb-6">
              <h3 className="text-xl font-bold mb-4">Summary</h3>
              <p>Total files processed: {similarityResults.length}</p>
              <p>Files with metadata changes: {similarityResults.filter(r => r.originalTitle !== r.newTitle).length}</p>
              <p>Files with filename changes: {similarityResults.filter(r => r.fileName.replace('.pdf', '') !== r.finalFileName).length}</p>
            </div>
            
            <button
              onClick={handleReset}
              className="py-3 px-6 bg-purple-700 rounded-lg font-bold hover:bg-purple-600 transition-colors"
            >
              Process More Files
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
