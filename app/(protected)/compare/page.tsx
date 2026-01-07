'use client';

// New comparison page - upload and compare contracts

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Spinner, FileText, TextAa } from '@phosphor-icons/react';
import { useSession } from '@/lib/auth/client';
import { useComparison } from '@/lib/contexts/comparison-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { DualUploadZone } from '@/components/contracts';
import { cn } from '@/lib/utils';

type InputMode = 'file' | 'text';

export default function ComparePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { setActiveComparison, isComparisonInProgress } = useComparison();

  const [mode, setMode] = useState<InputMode>('text');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [comparisonName, setComparisonName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let requestBody: Record<string, string>;

      if (mode === 'file' && sourceFile && targetFile) {
        // Read file contents
        const sourceContent = await readFileAsText(sourceFile);
        const targetContent = await readFileAsText(targetFile);

        requestBody = {
          sourceText: sourceContent,
          targetText: targetContent,
          sourceFileName: sourceFile.name,
          targetFileName: targetFile.name,
          name: comparisonName || undefined,
        } as Record<string, string>;
      } else {
        requestBody = {
          sourceText: sourceText.trim(),
          targetText: targetText.trim(),
          sourceFileName: 'Original Contract',
          targetFileName: 'Modified Contract',
          name: comparisonName || undefined,
        } as Record<string, string>;
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
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50 w-fit">
        <Button
          variant={mode === 'text' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('text')}
        >
          <TextAa size={16} data-icon="inline-start" />
          Paste Text
        </Button>
        <Button
          variant={mode === 'file' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('file')}
        >
          <FileText size={16} data-icon="inline-start" />
          Upload Files
        </Button>
      </div>

      {/* Upload/input area */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Documents</CardTitle>
          <CardDescription>
            {mode === 'file'
              ? 'Upload the original and modified versions of your contract'
              : 'Paste the contract text for both versions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Optional name field */}
          <Field>
            <FieldLabel>Comparison Name (optional)</FieldLabel>
            <Input
              placeholder="e.g., Acme Corp NDA - Q1 2024 Review"
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                <>
                  Compare Contracts
                  <ArrowRight size={16} data-icon="inline-end" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active comparison indicator */}
      {isComparisonInProgress && (
        <div className="p-4 rounded-lg bg-primary/10 text-sm">
          <div className="flex items-center gap-2">
            <Spinner size={16} className="animate-spin text-primary" />
            <span>A comparison is already in progress. Please wait for it to complete.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to read file as text
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
