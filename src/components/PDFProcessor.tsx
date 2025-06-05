import { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';

interface PDFProcessorProps {
  files: File[];
  onProcessingComplete: (results: ProcessedResult[]) => void;
}

export interface ProcessedResult {
  originalFile: File;
  modifiedFile?: File;
  originalTitle: string;
  newTitle: string;
  fileName: string;
  error?: boolean;
  errorMessage?: string;
}

export default function PDFProcessor({ files, onProcessingComplete }: PDFProcessorProps) {
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  
  useEffect(() => {
    const processFiles = async () => {
      const processedResults: ProcessedResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name.replace('.pdf', '');
        
        try {
          // Read the PDF file
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          
          // Get the metadata
          const originalTitle = pdfDoc.getTitle() || '';
          
          // Update the metadata title to match the filename
          pdfDoc.setTitle(fileName);
          
          // Save the modified PDF
          const modifiedPdfBytes = await pdfDoc.save();
          const modifiedPdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
          const modifiedFile = new File([modifiedPdfBlob], file.name, { type: 'application/pdf' });
          
          // Record the changes
          processedResults.push({
            originalFile: file,
            modifiedFile,
            originalTitle,
            newTitle: fileName,
            fileName: file.name
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          processedResults.push({
            originalFile: file,
            originalTitle: '',
            newTitle: '',
            error: true,
            errorMessage: (error as Error).message,
            fileName: file.name
          });
        }
        
        // Update progress
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setResults(processedResults);
      setProcessing(false);
      onProcessingComplete(processedResults);
    };
    
    processFiles();
  }, [files, onProcessingComplete]);
  
  return (
    <div className="w-full max-w-4xl">
      {/* <h2 className="text-2xl font-bold mb-4">Processing PDF Files</h2> */}
      
      {/* <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
        <div 
          className="bg-purple-700 h-4 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div> */}
      
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
      </div>

      <p className="text-center">{processing ? `Processing... ${progress}%` : 'Processing complete!'}</p>
      
      {!processing && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">Processing Summary</h3>
          <div className="bg-gray-800 p-4 rounded-xl mb-4">
            <p>Total files processed: {results.length}</p>
            <p>Files with metadata changes: {results.filter(r => r.originalTitle !== r.newTitle).length}</p>
            <p>Files with errors: {results.filter(r => r.error).length}</p>
          </div>
          
          <button
            onClick={() => onProcessingComplete(results)}
            className="w-full mt-4 py-3 px-6 bg-purple-700 rounded-lg font-bold hover:bg-purple-600 transition-colors"
          >
            Continue to Similarity Check
          </button>
        </div>
      )}
    </div>
  );
}