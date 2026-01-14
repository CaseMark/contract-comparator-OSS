// POST /api/contracts/compare - Create a new contract comparison
// This initiates the comparison process and returns immediately

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  createComparisonWithTextSchema,
  validateBody,
} from '@/lib/contracts/validations';
import { generateId, hashText } from '@/lib/contracts/utils';
import {
  extractClauses,
  matchClauses,
  analyzeRisk,
  generateExecutiveSummary,
  type ExtractedClause,
} from '@/lib/case-dev/client';
import type { Contract, Clause, ClauseType } from '@/types/contract';
import type { Comparison, ClauseMatch, RiskLevel } from '@/types/comparison';

// In-memory store for comparison status (in production, use Redis or similar)
// This is needed because IndexedDB only works client-side
const comparisonStatus = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: Comparison;
  clauseMatches?: ClauseMatch[];
  sourceContract?: Contract;
  targetContract?: Contract;
  metadata?: {
    name?: string;
    comparisonNumber?: number;
    sourceFileName?: string;
    targetFileName?: string;
  };
}>();

export async function POST(request: NextRequest) {
  // Parse body
  const body = await request.json();

  // For client-side auth, userId comes from the request
  // In production with server-side auth, this would come from session
  const userId = body.userId || 'anonymous';
  const organizationId = body.organizationId;

  // Validate required fields
  const validation = validateBody(createComparisonWithTextSchema, body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { sourceText, targetText, sourceFileName, targetFileName, name, comparisonNumber } = validation.data;

  // Generate IDs
  const comparisonId = generateId();
  const sourceContractId = generateId();
  const targetContractId = generateId();

  // Create contracts
  const sourceContract: Contract = {
    id: sourceContractId,
    name: sourceFileName || 'Source Contract',
    fileName: sourceFileName || 'source.txt',
    fileType: 'txt',
    fileSize: new Blob([sourceText]).size,
    content: sourceText,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
    organizationId: organizationId || undefined,
    status: 'completed',
  };

  const targetContract: Contract = {
    id: targetContractId,
    name: targetFileName || 'Target Contract',
    fileName: targetFileName || 'target.txt',
    fileType: 'txt',
    fileSize: new Blob([targetText]).size,
    content: targetText,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
    organizationId: organizationId || undefined,
    status: 'completed',
  };

  // Create initial comparison record
  const comparison: Comparison = {
    id: comparisonId,
    name: name || `Comparison ${String(comparisonNumber || 1).padStart(2, '0')}`,
    comparisonNumber: comparisonNumber || undefined,
    sourceContractId,
    targetContractId,
    sourceFileName: sourceContract.fileName,
    targetFileName: targetContract.fileName,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    organizationId: organizationId || undefined,
    status: 'pending',
    overallRiskScore: 0,
  };

  // Store initial status with comparison metadata
  comparisonStatus.set(comparisonId, {
    status: 'pending',
    metadata: {
      name: comparison.name,
      comparisonNumber: comparison.comparisonNumber,
      sourceFileName: comparison.sourceFileName,
      targetFileName: comparison.targetFileName,
    },
  });

  // Fire and forget - process in background
  processComparisonInBackground(
    comparisonId,
    sourceContract,
    targetContract,
    sourceText,
    targetText
  ).catch((error) => {
    console.error('Background comparison failed:', error);
    comparisonStatus.set(comparisonId, {
      status: 'failed',
      error: error.message,
    });
  });

  // Return immediately with comparison ID
  return NextResponse.json({
    id: comparisonId,
    status: 'processing',
    sourceContractId,
    targetContractId,
    name: comparison.name,
    createdAt: comparison.createdAt,
  }, { status: 201 });
}

// Background processing function
async function processComparisonInBackground(
  comparisonId: string,
  sourceContract: Contract,
  targetContract: Contract,
  sourceText: string,
  targetText: string
): Promise<void> {
  try {
    // Update status to processing (preserve metadata)
    const currentStatus = comparisonStatus.get(comparisonId);
    comparisonStatus.set(comparisonId, {
      status: 'processing',
      metadata: currentStatus?.metadata,
    });

    console.log(`[Comparison ${comparisonId}] Starting clause extraction...`);

    // Step 1: Extract clauses from both contracts in parallel
    let sourceClauses: ExtractedClause[];
    let targetClauses: ExtractedClause[];

    try {
      [sourceClauses, targetClauses] = await Promise.all([
        extractClauses(sourceText),
        extractClauses(targetText),
      ]);
    } catch (extractError) {
      console.error(`[Comparison ${comparisonId}] Clause extraction failed:`, extractError);
      throw new Error(`Clause extraction failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
    }

    console.log(`[Comparison ${comparisonId}] Extracted ${sourceClauses.length} source clauses, ${targetClauses.length} target clauses`);

    // Validate extracted clauses
    if (!Array.isArray(sourceClauses) || sourceClauses.length === 0) {
      throw new Error('Failed to extract clauses from source contract. Ensure the text contains valid contract content.');
    }
    if (!Array.isArray(targetClauses) || targetClauses.length === 0) {
      throw new Error('Failed to extract clauses from target contract. Ensure the text contains valid contract content.');
    }

    // Convert to Clause type with IDs and deduplication
    const sourceClausesWithIds = deduplicateClauses(
      sourceClauses.map((c) => ({
        id: generateId(),
        contractId: sourceContract.id,
        type: c.type as ClauseType,
        title: c.title,
        content: c.content,
        sectionNumber: c.sectionNumber,
        confidence: c.confidence,
        contentHash: hashText(c.content),
      }))
    );

    const targetClausesWithIds = deduplicateClauses(
      targetClauses.map((c) => ({
        id: generateId(),
        contractId: targetContract.id,
        type: c.type as ClauseType,
        title: c.title,
        content: c.content,
        sectionNumber: c.sectionNumber,
        confidence: c.confidence,
        contentHash: hashText(c.content),
      }))
    );

    // Step 2: Match clauses semantically
    console.log(`[Comparison ${comparisonId}] Matching clauses semantically...`);
    let matchResults;
    try {
      matchResults = await matchClauses(sourceClauses, targetClauses);
    } catch (matchError) {
      console.error(`[Comparison ${comparisonId}] Clause matching failed:`, matchError);
      throw new Error(`Clause matching failed: ${matchError instanceof Error ? matchError.message : 'Unknown error'}`);
    }

    // Validate match results
    if (!Array.isArray(matchResults)) {
      console.error(`[Comparison ${comparisonId}] Invalid match results:`, matchResults);
      throw new Error('Clause matching returned invalid results');
    }

    console.log(`[Comparison ${comparisonId}] Found ${matchResults.length} clause matches`);

    // Step 3: Analyze risk for each match in parallel
    const clauseMatches: ClauseMatch[] = [];
    const riskScores: number[] = [];

    console.log(`[Comparison ${comparisonId}] Analyzing risk for ${matchResults.length} matches...`);

    const riskPromises = matchResults.map(async (match, matchIndex) => {
      // Validate match object structure
      if (typeof match.sourceClauseIndex !== 'number') {
        console.warn(`[Comparison ${comparisonId}] Skipping match ${matchIndex} with invalid sourceClauseIndex:`, match);
        return;
      }

      const sourceClause = sourceClausesWithIds[match.sourceClauseIndex];
      if (!sourceClause) {
        console.warn(`[Comparison ${comparisonId}] Source clause not found at index ${match.sourceClauseIndex}, skipping match ${matchIndex}`);
        return;
      }

      const targetClause = match.targetClauseIndex !== null && match.targetClauseIndex !== undefined
        ? targetClausesWithIds[match.targetClauseIndex]
        : null;

      try {
        const riskResult = await analyzeRisk(
          {
            type: sourceClause.type,
            title: sourceClause.title,
            content: sourceClause.content,
            confidence: sourceClause.confidence,
          },
          targetClause
            ? {
                type: targetClause.type,
                title: targetClause.title,
                content: targetClause.content,
                confidence: targetClause.confidence,
              }
            : null,
          match.matchType
        );

        const clauseMatch: ClauseMatch = {
          id: generateId(),
          comparisonId,
          sourceClauseId: sourceClause.id,
          targetClauseId: targetClause?.id,
          sourceClauseType: sourceClause.type,
          targetClauseType: targetClause?.type,
          sourceClauseTitle: sourceClause.title,
          targetClauseTitle: targetClause?.title,
          sourceClauseContent: sourceClause.content,
          targetClauseContent: targetClause?.content,
          matchType: match.matchType,
          riskScore: riskResult.riskScore,
          riskLevel: riskResult.riskLevel as RiskLevel,
          riskRationale: riskResult.rationale,
          similarity: match.similarity,
        };

        clauseMatches.push(clauseMatch);
        if (match.matchType !== 'identical') {
          riskScores.push(riskResult.riskScore);
        }
      } catch (riskError) {
        console.error(`[Comparison ${comparisonId}] Risk analysis failed for match ${matchIndex}:`, riskError);
        // Continue processing other matches
      }
    });

    await Promise.all(riskPromises);

    console.log(`[Comparison ${comparisonId}] Risk analysis complete: ${clauseMatches.length} matches processed`);

    // Calculate overall risk score
    const overallRiskScore = calculateOverallRisk(riskScores);

    // Step 4: Generate executive summary
    console.log(`[Comparison ${comparisonId}] Generating executive summary...`);
    let summaryResult;
    try {
      summaryResult = await generateExecutiveSummary(
        sourceContract.name,
        targetContract.name,
        clauseMatches.map((m) => ({
          sourceType: m.sourceClauseType,
          targetType: m.targetClauseType,
          matchType: m.matchType,
          riskScore: m.riskScore,
          riskRationale: m.riskRationale,
        })),
        overallRiskScore
      );
    } catch (summaryError) {
      console.error(`[Comparison ${comparisonId}] Summary generation failed:`, summaryError);
      // Use a fallback summary
      summaryResult = {
        overview: 'Summary generation failed. Please review the clause analysis manually.',
        keyFindings: [],
        materialChanges: [],
        riskHighlights: [`Overall risk score: ${overallRiskScore}`],
        recommendations: ['Manual review recommended due to summary generation failure.'],
      };
    }

    console.log(`[Comparison ${comparisonId}] Comparison complete!`);

    // Build final comparison result
    // Get the stored metadata to preserve name and number from initial request
    const storedStatus = comparisonStatus.get(comparisonId);
    const metadata = storedStatus?.metadata;
    const finalComparison: Comparison = {
      id: comparisonId,
      name: metadata?.name || `Comparison`,
      comparisonNumber: metadata?.comparisonNumber,
      sourceContractId: sourceContract.id,
      targetContractId: targetContract.id,
      sourceFileName: metadata?.sourceFileName || sourceContract.fileName,
      targetFileName: metadata?.targetFileName || targetContract.fileName,
      createdAt: new Date().toISOString(),
      createdBy: sourceContract.uploadedBy,
      organizationId: sourceContract.organizationId,
      status: 'completed',
      overallRiskScore,
      summary: {
        overview: summaryResult.overview,
        keyFindings: summaryResult.keyFindings.map((f) => ({
          clauseType: f.clauseType as ClauseType,
          finding: f.finding,
          severity: f.severity as RiskLevel,
        })),
        materialChanges: summaryResult.materialChanges,
        riskHighlights: summaryResult.riskHighlights,
        recommendations: summaryResult.recommendations,
        generatedAt: new Date().toISOString(),
      },
    };

    // Store completed result with clause matches and contracts
    comparisonStatus.set(comparisonId, {
      status: 'completed',
      result: finalComparison,
      clauseMatches: clauseMatches,
      sourceContract,
      targetContract,
    });
  } catch (error) {
    console.error('Comparison processing error:', error);
    comparisonStatus.set(comparisonId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Helper: Deduplicate clauses by content hash and type
function deduplicateClauses(clauses: Clause[]): Clause[] {
  const seen = new Set<string>();
  return clauses.filter((clause) => {
    const key = `${clause.type}:${clause.contentHash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper: Calculate weighted overall risk
function calculateOverallRisk(scores: number[]): number {
  if (scores.length === 0) return 0;

  const weightedSum = scores.reduce((sum, score) => {
    const weight = score >= 75 ? 2 : score >= 50 ? 1.5 : 1;
    return sum + score * weight;
  }, 0);

  const totalWeight = scores.reduce((sum, score) => {
    return sum + (score >= 75 ? 2 : score >= 50 ? 1.5 : 1);
  }, 0);

  return Math.round(weightedSum / totalWeight);
}

// Export status map for the status endpoint
export { comparisonStatus };
