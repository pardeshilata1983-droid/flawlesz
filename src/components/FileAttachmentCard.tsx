import React, { useState } from 'react';
import { UploadedFile } from '../types.ts';
import { formatFileSize } from '../utils/fileExtractor.ts';
import { FileText, FileCode, Image as ImageIcon, Trash2, Eye, X, Check } from 'lucide-react';

interface FileAttachmentCardProps {
  file: UploadedFile;
  onRemove: (id: string) => void;
  isGlassMode?: boolean;
}

export const FileAttachmentCard: React.FC<FileAttachmentCardProps> = ({ file, onRemove, isGlassMode = false }) => {
  const [showPreview, setShowPreview] = useState(false);

  const getFileIcon = () => {
    if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-[#E8481C]" strokeWidth={1.5} />;
    }
    if (file.type.startsWith('image/') || file.previewUrl) {
      return <ImageIcon className="w-4 h-4 text-[#60A5FA]" strokeWidth={1.5} />;
    }
    if (file.type.includes('json') || file.type.includes('code') || /\.(ts|js|py|html|css)/.test(file.name)) {
      return <FileCode className="w-4 h-4 text-[#34D399]" strokeWidth={1.5} />;
    }
    return <FileText className="w-4 h-4 text-stone-300" strokeWidth={1.5} />;
  };

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 transition-colors rounded-lg px-3 py-2 text-xs ${
          isGlassMode
            ? 'bg-white/10 border border-white/20 text-white backdrop-blur-md'
            : 'bg-[#F5F4F0] border border-[#E0DEDA] hover:border-[#111111]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
              isGlassMode ? 'bg-white/15 border border-white/25' : 'bg-white border border-[#E0DEDA]'
            }`}
          >
            {getFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`font-medium truncate ${
                isGlassMode ? 'text-white idea-glass-subtle-shadow' : 'text-[#111111]'
              }`}
            >
              {file.name}
            </p>
            <div
              className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${
                isGlassMode ? 'text-white/70 idea-glass-subtle-shadow' : 'text-[#7A7A7A]'
              }`}
            >
              <span>{formatFileSize(file.size)}</span>
              {file.wordCount > 0 && (
                <>
                  <span>•</span>
                  <span>{file.wordCount.toLocaleString()} words</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`cursor-pointer p-1.5 rounded transition-colors ${
              isGlassMode
                ? 'text-white/80 hover:text-white hover:bg-white/15'
                : 'text-[#5A5A5A] hover:text-[#111111] hover:bg-white'
            }`}
            title="Preview extracted content"
          >
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className={`cursor-pointer p-1.5 rounded transition-colors ${
              isGlassMode
                ? 'text-white/80 hover:text-[#E8481C] hover:bg-white/15'
                : 'text-[#5A5A5A] hover:text-[#E8481C] hover:bg-white'
            }`}
            title="Remove attachment"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E0DEDA] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-[#E0DEDA] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon()}
                <span className="font-semibold text-sm truncate">{file.name}</span>
                <span className="text-xs font-mono text-[#7A7A7A]">({formatFileSize(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="cursor-pointer p-1 text-[#5A5A5A] hover:text-[#111111] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {file.previewUrl && (
                <div className="mb-4 text-center">
                  <img
                    src={file.previewUrl}
                    alt={file.name ? `Preview of attached document ${file.name}` : 'Document preview'}
                    className="max-h-60 mx-auto rounded-lg border border-[#E0DEDA] object-contain"
                  />
                </div>
              )}
              <div>
                <div className="text-xs font-mono text-[#5A5A5A] uppercase mb-2">
                  Extracted Text ({file.wordCount} words)
                </div>
                <pre className="text-xs font-mono bg-[#F5F4F0] p-4 rounded-lg border border-[#E0DEDA] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 text-[#111111]">
                  {file.content || 'No text extracted from this file.'}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-[#E0DEDA] flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="cursor-pointer bg-[#111111] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-black transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
