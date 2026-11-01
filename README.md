# ThreatDetector AI – Digital Trust & Threat Detection Platform

ThreatDetector AI is a web-based platform designed to help users assess the safety and authenticity of digital content through four analysis modules.

### Key Features

- **URL Threat Detection:** Identifies suspicious URL patterns and potential scam indicators using rule-based checks.
- **Claim Verification:** Evaluates claims based on specificity, context, and available verification resources.
- **Image Analysis:** Examines image metadata, dimensions, file properties, and compression indicators.
- **Video Deepfake Assessment:** Provides a framework for video analysis, including duration, resolution, and frame-sampling information.
- **Unified Digital Trust Report:** Combines module results into an overall risk assessment with confidence scores, evidence, coverage, and limitations.

### Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- Framer Motion
- Lucide Icons

### Getting Started

**1. Clone the repository**

```bash
git clone <repository-url>
cd threatdetector
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Implementation Status

- URL analysis uses rule-based heuristics.
- Claim analysis uses text-based checkability indicators.
- Image analysis currently uses file and metadata properties.
- Video analysis currently extracts basic video properties and prepares a frame-sampling plan.
- Advanced image manipulation and deepfake detection are planned for backend integration.

The application currently runs in browser-based demo mode, with a proposed FastAPI integration for backend services.

### Project Structure

```text
src/
├── app/          # Application routes
├── components/   # Reusable UI components
├── features/     # Analysis modules
├── lib/          # Utilities and scoring logic
├── services/     # API integration and validation
├── store/        # Local state management
└── types/        # TypeScript definitions
```

### Future Scope

- Backend integration using FastAPI.
- Advanced image manipulation detection.
- Video deepfake detection.
- Automated evidence retrieval for claim verification.
- External URL reputation and threat intelligence integration.

---

**Project Type:** Final-Year B.Tech Project
