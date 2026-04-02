import { useEffect, useCallback } from 'react';

export default function PdfViewerModal({ isOpen, onClose, blobUrl, fileName, title }) {
  useEffect(() => {
    return () => {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !blobUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'document.pdf';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-5xl h-[85vh] shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 truncate">{title || 'Document'}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
            >
              <span className="material-icons-outlined text-sm">download</span>
              Download
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400"
            >
              <span className="material-icons-outlined text-lg">close</span>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100">
          <iframe
            src={`${blobUrl}#toolbar=0&navpanes=0`}
            title={title || 'PDF viewer'}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
