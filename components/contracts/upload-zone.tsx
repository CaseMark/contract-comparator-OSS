'use client';

// Dual file upload zone for contract comparison
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/contracts/utils';

interface UploadZoneProps {
  label: string;
  description?: string;
  file: File | null;
  text?: string;
  onFileSelect: (file: File) => void;
  onTextChange?: (text: string) => void;
  onFileClear: () => void;
  accept?: Record<string, string[]>;
  isProcessing?: boolean;
  mode?: 'file' | 'text';
}

export function UploadZone({
  label,
  description,
  file,
  text,
  onFileSelect,
  onTextChange,
  onFileClear,
  accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
  },
  isProcessing,
  mode = 'file',
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: isProcessing,
  });

  if (mode === 'text') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <textarea
          className={cn(
            'w-full min-h-[200px] p-4 rounded-xl border bg-input/30 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30',
            'resize-y font-mono',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
          placeholder="Paste contract text here..."
          value={text || ''}
          onChange={(e) => onTextChange?.(e.target.value)}
          disabled={isProcessing}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {file ? (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-sm font-mono text-muted-foreground">
                {file.name.split('.').pop()?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onFileClear}
            disabled={isProcessing}
          >
            <span className="text-sm">×</span>
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed',
            'cursor-pointer transition-all duration-200',
            isDragActive
              ? 'border-foreground/50 bg-muted/50'
              : 'border-border hover:border-foreground/30 hover:bg-muted/30',
            isProcessing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <div className="p-3 rounded-full bg-muted mb-3">
            <span className="text-xl text-muted-foreground">↑</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT</p>
        </div>
      )}
    </div>
  );
}

// Dual upload component for comparing two contracts
interface DualUploadZoneProps {
  sourceFile: File | null;
  targetFile: File | null;
  sourceText?: string;
  targetText?: string;
  onSourceFileSelect: (file: File) => void;
  onTargetFileSelect: (file: File) => void;
  onSourceTextChange?: (text: string) => void;
  onTargetTextChange?: (text: string) => void;
  onSourceClear: () => void;
  onTargetClear: () => void;
  isProcessing?: boolean;
  mode?: 'file' | 'text';
}

export function DualUploadZone({
  sourceFile,
  targetFile,
  sourceText,
  targetText,
  onSourceFileSelect,
  onTargetFileSelect,
  onSourceTextChange,
  onTargetTextChange,
  onSourceClear,
  onTargetClear,
  isProcessing,
  mode = 'file',
}: DualUploadZoneProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UploadZone
        label="Original Contract"
        description="Upload the template or original version"
        file={sourceFile}
        text={sourceText}
        onFileSelect={onSourceFileSelect}
        onTextChange={onSourceTextChange}
        onFileClear={onSourceClear}
        isProcessing={isProcessing}
        mode={mode}
      />
      <UploadZone
        label="Redlined Contract"
        description="Upload the modified or redlined version"
        file={targetFile}
        text={targetText}
        onFileSelect={onTargetFileSelect}
        onTextChange={onTargetTextChange}
        onFileClear={onTargetClear}
        isProcessing={isProcessing}
        mode={mode}
      />
    </div>
  );
}
