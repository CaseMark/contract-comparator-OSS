'use client';

// New comparison page - upload and compare contracts
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@phosphor-icons/react';
import { useComparison } from '@/lib/contexts/comparison-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { DualUploadZone } from '@/components/contracts';
import { listComparisons } from '@/lib/storage';
import { cn } from '@/lib/utils';

type InputMode = 'file' | 'text';

export default function ComparePage() {
  const router = useRouter();
  const { setActiveComparison, isComparisonInProgress } = useComparison();

  const [mode, setMode] = useState<InputMode>('file');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [comparisonName, setComparisonName] = useState('');
  const [nextComparisonNumber, setNextComparisonNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comparison count to generate default name
  // Re-run when isComparisonInProgress changes to account for processing comparisons
  useEffect(() => {
    async function loadComparisonCount() {
      const comparisons = await listComparisons('anonymous');
      // Add 1 for the next comparison, plus 1 more if one is currently processing
      const baseCount = comparisons.length + 1;
      const adjustedCount = isComparisonInProgress ? baseCount + 1 : baseCount;
      setNextComparisonNumber(adjustedCount);
    }
    loadComparisonCount();
  }, [isComparisonInProgress]);

  // Generate default name if none provided
  const getComparisonName = () => {
    if (comparisonName.trim()) return comparisonName.trim();
    return `Comparison ${String(nextComparisonNumber).padStart(2, '0')}`;
  };

  const canSubmit =
    !isSubmitting &&
    !isComparisonInProgress &&
    ((mode === 'file' && sourceFile && targetFile) ||
      (mode === 'text' && sourceText.trim() && targetText.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let requestBody: Record<string, string | number | undefined>;

      const name = getComparisonName();

      if (mode === 'file' && sourceFile && targetFile) {
        // Extract text from files (uses OCR for PDF/DOCX)
        const [sourceContent, targetContent] = await Promise.all([
          extractTextFromFile(sourceFile),
          extractTextFromFile(targetFile),
        ]);

        requestBody = {
          sourceText: sourceContent,
          targetText: targetContent,
          sourceFileName: sourceFile.name,
          targetFileName: targetFile.name,
          name,
          comparisonNumber: nextComparisonNumber,
        };
      } else {
        requestBody = {
          sourceText: sourceText.trim(),
          targetText: targetText.trim(),
          sourceFileName: 'Original Contract',
          targetFileName: 'Modified Contract',
          name,
          comparisonNumber: nextComparisonNumber,
        };
      }

      // Submit comparison request
      const response = await fetch('/api/contracts/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start comparison');
      }

      const data = await response.json();

      // Set active comparison for tracking
      setActiveComparison({
        id: data.id,
        name: data.name,
        status: 'processing',
        startedAt: data.createdAt,
      });

      // Navigate to comparison results page
      router.push(`/compare/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">New Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Compare two versions of a contract to identify changes and assess risk
        </p>
      </div>

      {/* Input mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 w-fit">
        <Button
          variant={mode === 'file' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('file')}
        >
          Upload Files
        </Button>
        <Button
          variant={mode === 'text' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
        >
          Paste Text
        </Button>
      </div>

      {/* Upload/input area */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Documents</CardTitle>
          <CardDescription>
            {mode === 'file'
              ? 'Upload the original and modified versions of your contract'
              : 'Paste the text for both contract versions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Comparison name field - moved above upload */}
          <Field>
            <FieldLabel>Comparison Name</FieldLabel>
            <Input
              placeholder={`Comparison ${String(nextComparisonNumber).padStart(2, '0')}`}
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <DualUploadZone
            sourceFile={sourceFile}
            targetFile={targetFile}
            sourceText={sourceText}
            targetText={targetText}
            onSourceFileSelect={setSourceFile}
            onTargetFileSelect={setTargetFile}
            onSourceTextChange={setSourceText}
            onTargetTextChange={setTargetText}
            onSourceClear={() => {
              setSourceFile(null);
              setSourceText('');
            }}
            onTargetClear={() => {
              setTargetFile(null);
              setTargetText('');
            }}
            isProcessing={isSubmitting}
            mode={mode}
          />

          {/* Error message */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Spinner size={16} className="animate-spin" data-icon="inline-start" />
                  Processing...
                </>
              ) : (
                'Compare Contracts'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active comparison indicator */}
      {isComparisonInProgress && (
        <div className="p-4 bg-muted text-sm">
          <div className="flex items-center gap-2">
            <Spinner size={16} className="animate-spin text-muted-foreground" />
            <span>A comparison is already in progress. Please wait for it to complete.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to extract text from file using OCR API
async function extractTextFromFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/contracts/extract', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to extract text from file');
  }

  const data = await response.json();
  return data.text;
}
