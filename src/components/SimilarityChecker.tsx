import { useState, useEffect } from 'react';
import * as fuzzball from 'fuzzball';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import type { ProcessedResult } from './PDFProcessor';

interface SimilarityCheckerProps {
  processedFiles: ProcessedResult[];
  masterList: string[];
  onSimilarityChecked: (results: SimilarityResult[]) => void;
}

export interface SimilarityResult extends ProcessedResult {
  similarityMatches: {
    name: string;
    score: number;
  }[];
  finalFileName: string;
  selectedSimilarNames: string[];
  newTitle: string;
}

export default function SimilarityChecker({
  processedFiles,
  masterList,
  onSimilarityChecked,
}: SimilarityCheckerProps) {
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [editedFileName, setEditedFileName] = useState('');
  const [processing, setProcessing] = useState(true);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  useEffect(() => {
    const results: SimilarityResult[] = processedFiles.map((file) => {
      const baseName = file.fileName.replace('.pdf', '');
      const options = { limit: 5, cutoff: 60 };
      const matches = fuzzball.extract(baseName, masterList, options);
      return {
        ...file,
        similarityMatches: matches.map((m) => ({ name: m[0], score: m[1] })),
        finalFileName: baseName,
        selectedSimilarNames: [],
        newTitle: baseName,
      };
    });
    setSimilarityResults(results);
    setProcessing(false);
    if (results.length > 0) {
      setEditedFileName(results[0]!.fileName.replace('.pdf', ''));
    }
  }, [processedFiles, masterList]);

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedFileName(e.target.value);
  };

  const handleSelectSimilarName = (name: string) => {
    const updated = [...similarityResults];
    const current = updated[currentFileIndex]!;
    const index = current.selectedSimilarNames.indexOf(name);
    if (index > -1) {
      current.selectedSimilarNames.splice(index, 1);
    } else {
      current.selectedSimilarNames.push(name);
    }
    setSimilarityResults(updated);
  };

  const handleConfirmFileName = async () => {
    const updated = [...similarityResults];
    // Update final file name and metadata title
    updated[currentFileIndex]!.finalFileName = editedFileName;
    updated[currentFileIndex]!.newTitle = editedFileName;

    setSimilarityResults(updated);

    // Do not automatically move to next file on confirm
    if (currentFileIndex === similarityResults.length - 1) {
      // All done: generate report and zip renamed PDFs
      generateExcelReport(updated);
      setIsGeneratingZip(true);
      await generateZip(updated);
      setIsGeneratingZip(false);
      onSimilarityChecked(updated);
    }
  };

  const generateZip = async (results: SimilarityResult[]) => {
    const zip = new JSZip();
    for (const r of results) {
      if (r.modifiedFile) {
        const arrayBuffer = await r.modifiedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pdfDoc.setTitle(r.newTitle);
        // Update the PDF metadata title
        // Removed invalid page.setTitle call
        const bytes = await pdfDoc.save();
        zip.file(`${r.finalFileName || r.newTitle}.pdf`, bytes);
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const currentDate = new Date().toDateString();
    saveAs(zipBlob, `renamed_pdfs_${currentDate}.zip`);
  };

  const generateExcelReport = (results: SimilarityResult[]) => {
    const wsData: (string | number)[][] = [
      ['Original Filename', 'Original Metadata Title', 'New Filename', 'Selected Similar Files', 'All Similarity Scores'],
    ];
    results.forEach((r) => {
      wsData.push([
        r.fileName,
        r.originalTitle || '',
        r.newTitle,
        r.selectedSimilarNames.join(', '),
        r.selectedSimilarNames.map(name => {
          const m = r.similarityMatches.find(sm => sm.name === name);
          return m ? `${m.score}%` : '';
        }).filter(score => score !== '').join(', '),
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Similarity Results');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'similarity_results.xlsx');
  };

  if (processing || similarityResults.length === 0) {
    return <div className="text-center">Processing similarity...</div>;
  }

  if (isGeneratingZip) {
    return (
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <div>Generating zip file, please wait...</div>
      </div>
    );
  }

  const current = similarityResults[currentFileIndex]!;
  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Filename Similarity Check</h2>
      <div className="flex items-center justify-between mb-4">
        <p>File {currentFileIndex + 1} of {similarityResults.length}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (currentFileIndex > 0) {
                const prevIndex = currentFileIndex - 1;
                setCurrentFileIndex(prevIndex);
                setEditedFileName(similarityResults[prevIndex]!.fileName.replace('.pdf', ''));
              }
            }}
            disabled={currentFileIndex === 0}
            className={`p-2 rounded-lg transition-colors ${
              currentFileIndex === 0
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-600'
            }`}
            aria-label="Previous file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentFileIndex < similarityResults.length - 1) {
                const nextIndex = currentFileIndex + 1;
                setCurrentFileIndex(nextIndex);
                setEditedFileName(similarityResults[nextIndex]!.fileName.replace('.pdf', ''));
              }
            }}
            disabled={currentFileIndex === similarityResults.length - 1}
            className={`p-2 rounded-lg transition-colors ${
              currentFileIndex === similarityResults.length - 1
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-600'
            }`}
            aria-label="Next file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl mb-6">
        <h3 className="text-xl font-bold mb-2">Current File: {current.fileName}</h3>
        <p className="mb-4">Original Metadata Title: {current.originalTitle || 'None'}</p>

        <div className="mb-6">
          <label className="block mb-2">Edit Final Filename:</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              onClick={() => setEditedFileName(current.fileName.replace('.pdf', ''))}
            >
              Use Original Filename
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              onClick={() => setEditedFileName(current.originalTitle || '')}
              disabled={!current.originalTitle}
            >
              Use Metadata Title
            </button>
          </div>
          <input
            type="text"
            value={editedFileName}
            onChange={handleFileNameChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>

        {current.similarityMatches.length > 0 ? (
          <div>
            <h4 className="font-bold mb-2">Select Similar Filenames:</h4>
            <ul className="space-y-2">
              {current.similarityMatches.map((match, idx) => {
                const selected = current.selectedSimilarNames.includes(match.name);
                return (
                  <li
                    key={idx}
                    onClick={() => handleSelectSimilarName(match.name)}
                    className={
                      'flex justify-between items-center p-2 rounded cursor-pointer ' +
                      (selected
                        ? 'bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600')
                    }
                  >
                    <span>{match.name}</span>
                    <span className="bg-purple-700 px-2 py-1 rounded text-sm">
                      {match.score}% match
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-yellow-400">No similar filenames found in master list.</p>
        )}
      </div>

      <button
        onClick={handleConfirmFileName}
        className="w-full mt-4 py-3 px-6 bg-purple-700 rounded-lg font-bold hover:bg-purple-600 transition-colors"
      >
        {currentFileIndex === similarityResults.length - 1 ? 'Download Files and Report' : 'Confirm'}
      </button>
    </div>
  );
}
