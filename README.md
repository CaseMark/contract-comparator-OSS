# Contract Comparator

**AI-Powered Contract Clause Analysis**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org)
[![Case.dev](https://img.shields.io/badge/Powered%20by-Case.dev-EB5600)](https://case.dev)

Compare contracts side-by-side with AI-powered clause extraction, semantic matching, and risk analysis. Built on the [Case.dev](https://case.dev) legal AI platform.

**No sign-up required** — start comparing contracts immediately.

## What It Does

Contract Comparator analyzes two contracts and provides:

- **Clause Extraction** — Automatically identifies and categorizes clauses (indemnification, termination, liability limits, etc.)
- **Semantic Matching** — Pairs similar clauses between documents, even when wording differs
- **Risk Scoring** — Rates each clause change from 0-100 based on legal significance and business impact
- **Executive Summary** — AI-generated overview of key findings, material changes, and recommendations

### Use Cases

- Compare a vendor's contract against your standard template
- Review redlined agreements to understand what changed
- Analyze competing proposals side-by-side
- Audit contract versions for compliance drift

---

## Demo Limits

This demo provides free access with the following limits:

| Limit | Value |
|-------|-------|
| **Session Duration** | 24 hours |
| **API Credit** | $5 USD |

Once either limit is reached, create an account at [console.case.dev](https://console.case.dev) for unlimited access.

### How Costs Are Calculated

- **LLM Processing**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **OCR (PDF/DOCX)**: $0.02 per page

A typical contract comparison uses approximately $0.10-0.30 in API credits depending on document length.

---

## Browser Isolation

All data is stored locally in your browser using localStorage and IndexedDB. Documents and comparisons are isolated per browser — data from one browser or device is not accessible from another.

### localStorage

| Key | Purpose |
|-----|---------|
| `ccc:demoUsage` | API usage tracking (tokens, cost, session start) |
| `ccc:activeComparison` | Currently processing comparison ID |

### IndexedDB

The `contract-comparator` database stores:

| Store | Purpose |
|-------|---------|
| `comparisons` | Completed comparison results with summaries |
| `clauseMatches` | Individual clause match details and risk scores |
| `contracts` | Uploaded contract metadata and extracted text |

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/CaseMark/contract-comparator-demo.git
cd contract-comparator-demo
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Add your Case.dev API key (get one free at [console.case.dev](https://console.case.dev)):

```env
CASEDEV_API_KEY=your_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Full API Access

Ready to build your own legal AI application?

### [→ Get Started at console.case.dev](https://console.case.dev)

Case.dev provides:

- **LLM API** — OpenAI-compatible chat completions optimized for legal tasks
- **OCR API** — Extract text from PDFs, DOCXs, and images
- **Semantic Search** — Vector-based document retrieval
- **Vaults** — Secure document storage with automatic indexing

Pricing starts at $0.01 per credit with volume discounts available.

### Resources

- [Case.dev Documentation](https://case.dev/docs)
- [API Reference](https://case.dev/docs/api)
- [SDK Examples](https://github.com/CaseMark/case-dev-examples)

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [Base UI](https://base-ui.com)
- **AI Platform**: [Case.dev](https://case.dev)
- **Storage**: localStorage + IndexedDB (browser-only, no server database)

---

## Project Structure

```
├── app/
│   ├── (protected)/      # App routes (dashboard, compare)
│   │   ├── dashboard/    # Comparison history
│   │   └── compare/      # New comparison & results
│   └── api/
│       └── contracts/    # Compare & extract endpoints
├── components/
│   ├── demo/             # Usage banner & limit dialog
│   └── ui/               # Base UI components
├── lib/
│   ├── case-dev/         # Case.dev API client
│   ├── usage/            # Demo limit tracking
│   ├── storage/          # localStorage & IndexedDB helpers
│   └── contexts/         # React contexts
└── types/                # TypeScript definitions
```

---

## License

This project is licensed under the [Apache 2.0 License](LICENSE).

---

<p align="center">
  <a href="https://case.dev">
    <img src="https://case.dev/logo.svg" alt="Case.dev" width="120" />
  </a>
  <br />
  <sub>Built with Case.dev — The Legal AI Platform</sub>
</p>
