import { useState, useEffect } from 'react';
import * as fuzzball from 'fuzzball';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ProcessedResult } from './PDFProcessor';

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
}

export default function SimilarityChecker({ processedFiles, masterList, onSimilarityChecked }: SimilarityCheckerProps) {
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [editedFileName, setEditedFileName] = useState('');
  const [processing, setProcessing] = useState(true);
  
  useEffect(() => {
    // Calculate similarity for all files
    const results = processedFiles.map(file => {
      const fileName = file.fileName.replace('.pdf', '');
      
      // Get top 5 similar filenames from master list
      const options = { limit: 5, cutoff: 60 }; // Only return matches with score > 60
      const matches = fuzzball.extract(fileName, masterList, options);
      
      return {
        ...file,
        similarityMatches: matches.map(match => ({
          name: match[0],
          score: match[1]
        })),
        finalFileName: fileName // Initialize with current filename
      };
    });
    
    setSimilarityResults(results);
    setProcessing(false);
    
    if (results.length > 0) {
      setEditedFileName(results[0].fileName.replace('.pdf', ''));
    }
  }, [processedFiles, masterList]);
  
  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedFileName(e.target.value);
  };
  
  const handleSelectSimilarName = (name: string) => {
    setEditedFileName(name);
  };
  
  const handleConfirmFileName = () => {
    // Update the current file's final name
    const updatedResults = [...similarityResults];
    updatedResults[currentFileIndex].finalFileName = editedFileName;
    setSimilarityResults(updatedResults);
    
    // Move to next file or finish
    if (currentFileIndex < similarityResults.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setEditedFileName(updatedResults[currentFileIndex + 1].fileName.replace('.pdf', ''));
    } else {
      // All files processed, generate report
      generateExcelReport(updatedResults);
      onSimilarityChecked(updatedResults);
    }
  };
  
  const generateExcelReport = (results: SimilarityResult[]) => {
    // Create worksheet data
    const wsData = [
      ['File Name', 'Original Metadata Title', 'New Metadata Title', 'Final File Name', 'Best Match', 'Match Score', 'Status']
    ];
    
    results.forEach(result => {
      const bestMatch = result.similarityMatches && result.similarityMatches.length > 0 
        ? result.similarityMatches[0] 
        : { name: 'No match', score: 0 };
        
      wsData.push([
        result.fileName,
        result.originalTitle || 'N/A',
        result.newTitle,
        result.finalFileName,
        bestMatch.name,
        bestMatch.score.toString() + '%',
        result.error ? 'Error: ' + result.errorMessage : 'Success'
      ]);
    });
    
    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDF Processing Results');
    
    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'pdf_processing_results.xlsx');
  };
  
  if (processing || similarityResults.length === 0) {
    return <div className="text-center">Processing similarity...</div>;
  }
  
  const currentFile = similarityResults[currentFileIndex];
  const similarMatches = currentFile.similarityMatches || [];
  
  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Filename Similarity Check</h2>
      <p className="mb-4">File {currentFileIndex + 1} of {similarityResults.length}</p>
      
      <div className="bg-gray-800 p-6 rounded-xl mb-6">
        <h3 className="text-xl font-bold mb-2">Current File: {currentFile.fileName}</h3>
        <p className="mb-4">Original Metadata Title: {currentFile.originalTitle || 'None'}</p>
        <p className="mb-4">New Metadata Title: {currentFile.newTitle}</p>
        
        <div className="mb-6">
          <label className="block mb-2">Edit Final Filename:</label>
          <input 
            type="text" 
            value={editedFileName} 
            onChange={handleFileNameChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>
        
        {similarMatches.length > 0 ? (
          <div>
            <h4 className="font-bold mb-2">Similar Filenames in Master List:</h4>
            <ul className="space-y-2">
              {similarMatches.map((match, index) => (
                <li 
                  key={index} 
                  className="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                  onClick={() => handleSelectSimilarName(match.name)}
                >
                  <span>{match.name}</span>
                  <span className="bg-purple-700 px-2 py-1 rounded text-sm">
                    {match.score}% match
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-yellow-400">No similar filenames found in master list.</p>
        )}
      </div>
      
      <button
        onClick={handleConfirmFileName}
        className="w-full py-3 px-6 bg-purple-700 rounded-lg font-bold hover:bg-purple-600 transition-colors"
      >
        {currentFileIndex < similarityResults.length - 1 ? 'Confirm & Next' : 'Finish & Download Report'}
      </button>
    </div>
  );
}