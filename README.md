# IBPS Mock Lab — Phase 1 Starter

A local-first Next.js starter for a custom banking exam mock-test application.

## Included in Phase 1
- Next.js App Router, TypeScript, Tailwind CSS
- Three default sections: English, Quant, Reasoning
- Add/remove/rename sections
- Total timer, section timer, and untimed practice setup
- Sample exam interface, question palette, mark-for-review, response saving
- IndexedDB storage for sample question bank and attempts
- Resume an in-progress attempt after refresh
- Score calculation with negative marking
- Responsive dashboard and result review

## Not included yet
- PDF/DOCX/image import and OCR
- Automatic next-section transition when a section timer expires (needs broader edge-case tests)
- PWA/service-worker offline installation
- Custom question editor, advanced analytics, cloud sync

These are intentionally staged for subsequent phases.

## Setup on Windows (PowerShell)

Install Node.js LTS first: https://nodejs.org/

Check installation:
```powershell
node -v
npm -v
```

Unzip this folder, then in VS Code open the `ibps-mock-generator` folder and run:
```powershell
npm install
npm run dev
```

Open http://localhost:3000

## Verification
In a second terminal:
```powershell
npm run typecheck
npm run lint
npm run build
```

## Test the starter manually
1. Open the dashboard.
2. Click **Save sample bank locally** and check the saved-question count.
3. Click **Create mock test**.
4. Try total timer, section timers, and untimed mode.
5. Answer and mark questions, navigate, then submit.
6. Refresh during a test and click **Resume saved mock**.
7. Review the score and explanations.

## Storage notes
Questions and attempts are stored in IndexedDB for this browser origin. Clearing site data can remove them. Export/restore is planned for a later phase; do not rely on browser storage as your only backup.

## Suggested next phases
1. Add import/preview/review and JSON backup.
2. Add text-based PDF extraction.
3. Add scanned PDF OCR loaded on demand.
4. Add PWA offline caching and test recovery improvements.
5. Add advanced analytics and optional synchronization.
