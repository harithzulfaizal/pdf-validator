import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export default function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  
  const onPdfDrop = useCallback((acceptedFiles: File[]) => {
    const filteredFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    setPdfFiles(filteredFiles);
  }, []);
  
  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps } = useDropzone({
    onDrop: onPdfDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });
  
  const handleSubmit = () => {
    if (pdfFiles.length > 0) {
      onFilesSelected(pdfFiles);
    }
  };
  
  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:bg-gray-800" {...getPdfRootProps()}>
        <input {...getPdfInputProps()} />
        <p className="text-center">Drag & drop PDF files here, or click to select files</p>
        {pdfFiles.length > 0 && (
          <p className="mt-4 text-green-400">{pdfFiles.length} PDF files selected</p>
        )}
      </div>
      
      <button
        onClick={handleSubmit}
        disabled={pdfFiles.length === 0}
        className="w-full mt-8 py-3 px-6 bg-purple-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors"
      >
        Process Files
      </button>
    </div>
  );
}