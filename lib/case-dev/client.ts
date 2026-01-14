// Case.dev API client for contract clause comparator
// Direct HTTP implementation

const CASEDEV_API_URL = process.env.CASEDEV_API_URL || 'https://api.case.dev';
const CASEDEV_API_KEY = process.env.CASEDEV_API_KEY;
const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// API Request Helper
// ============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!CASEDEV_API_KEY) {
    throw new Error('CASEDEV_API_KEY environment variable is not set');
  }

  const url = `${CASEDEV_API_URL}${endpoint}`;

  if (DEBUG) {
    console.log(`[Case.dev] POST ${endpoint}`);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CASEDEV_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`[Case.dev] API error (${response.status}):`, responseText);
    throw new Error(`Case.dev API error (${response.status}): ${responseText}`);
  }

  try {
    const json = JSON.parse(responseText);
    if (DEBUG) {
      console.log(`[Case.dev] Response:`, JSON.stringify(json).substring(0, 200));
    }
    return json;
  } catch {
    console.error('[Case.dev] Failed to parse response as JSON:', responseText.substring(0, 500));
    throw new Error('Case.dev API returned invalid JSON');
  }
}

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

// ============================================================================
// LLM Functions
// ============================================================================

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options?.model || 'anthropic/claude-3-5-sonnet-20241022';

  const response = await apiRequest<ChatCompletionResponse>('/llm/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens || 4096,
    }),
  });

  // Validate response structure
  if (!response?.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    console.error('[Case.dev] Invalid chat completion response structure:', response);
    throw new Error('Case.dev returned invalid chat completion response');
  }

  const content = response.choices[0]?.message?.content;
  if (typeof content !== 'string') {
    console.error('[Case.dev] Missing content in chat completion response:', response.choices[0]);
    throw new Error('Case.dev response missing message content');
  }

  return content;
}

export async function generateEmbeddings(
  text: string,
  model: string = 'voyage-law-2'
): Promise<number[]> {
  const response = await apiRequest<EmbeddingResponse>('/llm/v1/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      input: text,
      model,
    }),
  });

  // Validate response structure
  if (!response?.data || !Array.isArray(response.data) || response.data.length === 0) {
    console.error('[Case.dev] Invalid embeddings response structure:', response);
    throw new Error('Case.dev returned invalid embeddings response');
  }

  const embedding = response.data[0]?.embedding;
  if (!Array.isArray(embedding)) {
    console.error('[Case.dev] Missing embedding in response:', response.data[0]);
    throw new Error('Case.dev response missing embedding data');
  }

  return embedding;
}

// ============================================================================
// Clause Extraction
// ============================================================================

const CLAUSE_TYPES = [
  'indemnification',
  'liability',
  'confidentiality',
  'termination',
  'warranty',
  'dispute_resolution',
  'intellectual_property',
  'non_compete',
  'force_majeure',
  'assignment',
  'governing_law',
  'payment_terms',
  'representation',
  'insurance',
  'other',
] as const;

export interface ExtractedClause {
  type: string;
  title: string;
  content: string;
  sectionNumber?: string;
  confidence: number;
}

export async function extractClauses(contractText: string): Promise<ExtractedClause[]> {
  const systemPrompt = `You are a legal document analyst specializing in contract clause extraction.

Extract all clauses from the provided contract text. For each clause, identify:
- type: One of: ${CLAUSE_TYPES.join(', ')}
- title: The clause heading or a descriptive title
- content: The complete clause text
- sectionNumber: The section number if present (e.g., "4.2.1")
- confidence: Your confidence in the classification (0.0 to 1.0)

Return ONLY a JSON array of clauses. No additional text or explanation.

Example output format:
[
  {
    "type": "indemnification",
    "title": "Indemnification",
    "content": "Each party shall indemnify...",
    "sectionNumber": "8.1",
    "confidence": 0.95
  }
]`;

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contractText },
    ],
    { temperature: 0, maxTokens: 8192 }
  );

  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse clause extraction response:', response);
    throw new Error('Failed to parse clause extraction response');
  }
}

// ============================================================================
// Clause Matching
// ============================================================================

export interface ClauseMatchResult {
  sourceClauseIndex: number;
  targetClauseIndex: number | null;
  matchType: 'identical' | 'modified' | 'added' | 'removed';
  similarity: number;
}

export async function matchClauses(
  sourceClauses: ExtractedClause[],
  targetClauses: ExtractedClause[]
): Promise<ClauseMatchResult[]> {
  const systemPrompt = `You are a legal document comparison expert specializing in semantic clause matching.

Compare the SOURCE clauses with the TARGET clauses. For each SOURCE clause, find the best matching TARGET clause even if:
- The clause has been reorganized or renumbered
- The wording has changed but the meaning is similar
- The clause type is slightly different

For each source clause, provide:
- sourceClauseIndex: Index of the source clause (0-based)
- targetClauseIndex: Index of the matching target clause (0-based), or null if removed
- matchType: "identical" (exact match), "modified" (changes detected), "removed" (no match in target)
- similarity: Semantic similarity score (0.0 to 1.0)

Also identify any TARGET clauses that don't match any SOURCE clause (these are "added").

Return ONLY a JSON array. No additional text.`;

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          sourceClauses: sourceClauses.map((c, i) => ({
            index: i,
            type: c.type,
            title: c.title,
            content: c.content.substring(0, 1000), // Truncate for token limits
          })),
          targetClauses: targetClauses.map((c, i) => ({
            index: i,
            type: c.type,
            title: c.title,
            content: c.content.substring(0, 1000),
          })),
        }),
      },
    ],
    { temperature: 0, maxTokens: 4096 }
  );

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse clause matching response:', response);
    throw new Error('Failed to parse clause matching response');
  }
}

// ============================================================================
// Risk Analysis
// ============================================================================

export interface RiskAnalysisResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  concerns: string[];
}

export async function analyzeRisk(
  sourceClause: ExtractedClause,
  targetClause: ExtractedClause | null,
  matchType: 'identical' | 'modified' | 'added' | 'removed'
): Promise<RiskAnalysisResult> {
  // Identical clauses have no risk
  if (matchType === 'identical') {
    return {
      riskScore: 0,
      riskLevel: 'low',
      rationale: 'Clause is unchanged.',
      concerns: [],
    };
  }

  const systemPrompt = `You are a legal risk analyst specializing in contract change assessment.

Analyze the legal risk of the following contract change. Score the risk from 0-100:
- 0-24: Low risk - Minor wording changes, no material impact
- 25-49: Medium risk - Some legal implications, review recommended
- 50-74: High risk - Significant changes to rights or obligations
- 75-100: Critical risk - Major liability exposure or unfavorable terms

Provide:
- riskScore: Number from 0-100
- riskLevel: "low", "medium", "high", or "critical"
- rationale: Brief explanation (1-2 sentences)
- concerns: Array of specific legal concerns (if any)

Return ONLY a JSON object. No additional text.`;

  const userContent = matchType === 'removed'
    ? `REMOVED CLAUSE:\nType: ${sourceClause.type}\nTitle: ${sourceClause.title}\nContent: ${sourceClause.content}`
    : matchType === 'added'
    ? `ADDED CLAUSE:\nType: ${targetClause!.type}\nTitle: ${targetClause!.title}\nContent: ${targetClause!.content}`
    : `ORIGINAL CLAUSE:\nType: ${sourceClause.type}\nTitle: ${sourceClause.title}\nContent: ${sourceClause.content}\n\nMODIFIED CLAUSE:\nType: ${targetClause!.type}\nTitle: ${targetClause!.title}\nContent: ${targetClause!.content}`;

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    { temperature: 0, maxTokens: 1024 }
  );

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse risk analysis response:', response);
    // Return a default medium risk if parsing fails
    return {
      riskScore: 50,
      riskLevel: 'medium',
      rationale: 'Risk analysis could not be completed automatically.',
      concerns: ['Manual review recommended'],
    };
  }
}

// ============================================================================
// Executive Summary Generation
// ============================================================================

export interface ExecutiveSummaryResult {
  overview: string;
  keyFindings: Array<{
    clauseType: string;
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  materialChanges: string[];
  riskHighlights: string[];
  recommendations: string[];
}

export async function generateExecutiveSummary(
  sourceContractName: string,
  targetContractName: string,
  clauseMatches: Array<{
    sourceType: string;
    targetType?: string;
    matchType: string;
    riskScore: number;
    riskRationale?: string;
  }>,
  overallRiskScore: number
): Promise<ExecutiveSummaryResult> {
  const systemPrompt = `You are a senior legal analyst preparing an executive summary of a contract comparison.

Create a concise executive summary that:
1. Provides a 2-3 sentence overview of the comparison
2. Lists 3-5 key findings linked to specific clause types
3. Identifies material changes that require attention
4. Highlights key risk areas
5. Provides actionable recommendations

Return ONLY a JSON object with this structure:
{
  "overview": "string",
  "keyFindings": [{"clauseType": "string", "finding": "string", "severity": "low|medium|high|critical"}],
  "materialChanges": ["string"],
  "riskHighlights": ["string"],
  "recommendations": ["string"]
}`;

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          sourceDocument: sourceContractName,
          targetDocument: targetContractName,
          overallRiskScore,
          clauseAnalysis: clauseMatches,
        }),
      },
    ],
    { temperature: 0.1, maxTokens: 2048 }
  );

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse executive summary response:', response);
    throw new Error('Failed to parse executive summary response');
  }
}

// ============================================================================
// OCR - Document Text Extraction
// ============================================================================

interface OCRJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface OCRStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    text: string;
    pages?: number;
  };
  error?: string;
}

interface OCRResultResponse {
  text: string;
  tables?: Array<{
    data: string[][];
    page: number;
  }>;
  metadata?: {
    pages: number;
    file_type: string;
  };
}

/**
 * Submit a document for OCR processing
 * Supports PDF, DOCX, and TXT files
 */
export async function submitOCRJob(file: File): Promise<string> {
  if (!CASEDEV_API_KEY) {
    throw new Error('CASEDEV_API_KEY environment variable is not set');
  }

  const formData = new FormData();
  formData.append('file', file);

  if (DEBUG) {
    console.log(`[Case.dev] OCR submit: ${file.name} (${file.type})`);
  }

  const response = await fetch(`${CASEDEV_API_URL}/ocr/v1/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CASEDEV_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Case.dev] OCR submit error (${response.status}):`, errorText);
    throw new Error(`OCR submission failed: ${errorText}`);
  }

  const result: OCRJobResponse = await response.json();
  return result.job_id;
}

/**
 * Check OCR job status
 */
export async function checkOCRStatus(jobId: string): Promise<OCRStatusResponse> {
  const response = await apiRequest<OCRStatusResponse>(`/ocr/v1/status/${jobId}`, {
    method: 'GET',
  });
  return response;
}

/**
 * Download OCR results
 */
export async function downloadOCRResults(jobId: string): Promise<OCRResultResponse> {
  const response = await apiRequest<OCRResultResponse>(`/ocr/v1/results/${jobId}`, {
    method: 'GET',
  });
  return response;
}

/**
 * Process a document and wait for OCR completion
 * Returns extracted text
 */
export async function extractTextFromFile(file: File): Promise<string> {
  // For plain text files, just read directly
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  // Submit OCR job
  const jobId = await submitOCRJob(file);

  if (DEBUG) {
    console.log(`[Case.dev] OCR job submitted: ${jobId}`);
  }

  // Poll for completion (max 60 seconds)
  const maxAttempts = 30;
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const status = await checkOCRStatus(jobId);

    if (DEBUG) {
      console.log(`[Case.dev] OCR status (${attempt + 1}/${maxAttempts}): ${status.status}`);
    }

    if (status.status === 'completed') {
      // Get the full results
      const results = await downloadOCRResults(jobId);
      return results.text;
    }

    if (status.status === 'failed') {
      throw new Error(`OCR processing failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('OCR processing timed out');
}

// ============================================================================
// Semantic Tagging
// ============================================================================

export interface SemanticTagResult {
  contractType: string[];
  industry: string[];
  riskLevel: string;
  keyTerms: string[];
  parties: string[];
}

export async function generateSemanticTags(
  contractContent: string
): Promise<SemanticTagResult> {
  const systemPrompt = `You are a legal document classifier. Analyze the contract and generate semantic tags.

Return ONLY a JSON object with:
{
  "contractType": ["string"], // e.g., ["NDA", "Service Agreement"]
  "industry": ["string"], // e.g., ["Technology", "Healthcare"]
  "riskLevel": "string", // "low", "medium", "high", or "critical"
  "keyTerms": ["string"], // Important legal terms found
  "parties": ["string"] // Names of parties involved
}`;

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contractContent.substring(0, 4000) }, // Limit for token efficiency
    ],
    { temperature: 0, maxTokens: 1024 }
  );

  try {
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse semantic tags response:', response);
    return {
      contractType: ['Unknown'],
      industry: ['Unknown'],
      riskLevel: 'medium',
      keyTerms: [],
      parties: [],
    };
  }
}
