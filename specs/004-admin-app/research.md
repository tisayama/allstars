# Technical Research: Admin Dashboard

**Feature**: Admin App for Pre-Event Quiz Setup
**Date**: 2025-11-03
**Status**: Complete

## Overview

This document captures all technical decisions for implementing the admin-app dashboard within the AllStars monorepo. The dashboard enables event organizers to manage quiz questions, guest lists, generate QR codes, and configure game settings before the wedding event.

---

## Decision 1: Frontend Framework

### Chosen: React 18.2+ with TypeScript

**Rationale**:
- React dominates the admin dashboard ecosystem with mature libraries for forms (React Hook Form), tables (TanStack Table), and dynamic UI patterns
- Excellent TypeScript support with modern type inference, especially when paired with Vite
- Firebase provides first-class React hooks via `react-firebase-hooks` for seamless Auth and Firestore integration
- Component model is ideal for complex CRUD forms with dynamic fields (add/remove question choices)

**Alternatives Considered**:
- **Vue 3**: Strong DX but smaller ecosystem for admin-specific libraries. VeeValidate is less mature than React Hook Form for complex dynamic forms
- **Svelte/SvelteKit**: Excellent performance but limited Firebase integration libraries. Would require custom code for Auth flows
- **Vanilla TypeScript**: Too much boilerplate for managing complex form state and dynamic UI updates

**Integration**:
- Use Vite's React-TypeScript template for fast HMR
- Leverage `firebase/auth` and `firebase/firestore` SDKs (v9+ modular API)
- TypeScript path aliases will map `@allstars/types` workspace for API contract types

---

## Decision 2: UI Component Library

### Chosen: shadcn/ui 2.0+ (Radix UI + Tailwind CSS)

**Rationale**:
- Not a traditional component library - provides copy-pasteable components you own, avoiding library lock-in
- Built on Radix UI primitives (accessible, unstyled) + Tailwind CSS for utility-first styling
- Perfect for admin dashboards where custom layouts are needed beyond pre-built themes
- Excellent TypeScript support with proper generic types for forms and data tables
- Includes all required components: Form fields, data tables, modals, file upload, toast notifications

**Alternatives Considered**:
- **Material UI (MUI)**: Heavyweight (300KB+), opinionated styling, harder to customize. Good for rapid prototyping but less flexible
- **Ant Design**: Excellent admin components but heavy bundle size and design system lock-in. Chinese-first documentation
- **Chakra UI**: Good middle ground but less momentum. Still uses runtime CSS-in-JS (performance impact)
- **Mantine**: Rising star with good TypeScript support but smaller ecosystem

**Integration**:
- Initialize with `npx shadcn-ui@latest init` in `/apps/admin-app`
- Tailwind config scoped to admin-app workspace
- Components stored in `/apps/admin-app/src/components/ui/` (not node_modules)

---

## Decision 3: Form Management

### Chosen: React Hook Form 7.48+ with Zod validation

**Rationale**:
- Best-in-class performance for React forms using uncontrolled inputs (minimal re-renders)
- Critical for dynamic question forms with add/remove choice fields - handles field arrays natively
- Native Zod integration via `@hookform/resolvers/zod` - reuse validation schemas from api-server
- Excellent TypeScript inference - form values fully typed based on Zod schema
- Built-in support for file uploads, nested forms, and async validation

**Alternatives Considered**:
- **Formik**: Older generation, more re-renders, less TypeScript friendly. React Hook Form is the modern successor
- **TanStack Form**: Very new, immature ecosystem for file uploads and complex validation
- **VeeValidate**: Vue-specific, not applicable

**Integration**:
```typescript
import { CreateQuestionSchema } from '@allstars/types/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(CreateQuestionSchema),
});
```

**Dependencies**: `react-hook-form`, `@hookform/resolvers`, `zod` (already in monorepo)

---

## Decision 4: QR Code Generation

### Chosen: qrcode.react 4.0+

**Rationale**:
- React component with excellent TypeScript support. Renders QR codes as Canvas or SVG
- SVG output is resolution-independent - perfect for print layouts (scales without pixelation)
- Supports error correction levels (L, M, Q, H) for robust scanning even with slight damage to printed cards
- Simple API: `<QRCodeSVG value={url} size={256} level="H" />`

**Alternatives Considered**:
- **qrcode.js / qrcodejs2**: Lower-level libraries requiring manual DOM manipulation. Not React-friendly
- **react-qr-code**: Similar functionality but less mature (fewer downloads, less active maintenance)
- **node-qrcode**: Server-side only, not suitable for client-side generation

**Integration**:
- Install: `pnpm add qrcode.react`
- For print, render SVG variant and use CSS `@media print` for page breaks
- Generate guest-specific auth URLs: `https://[participant-app]/join?token=[guest-token]`

---

## Decision 5: CSV Parsing

### Chosen: PapaParse 5.4+

**Rationale**:
- Industry-standard CSV parser with 20K+ weekly downloads. Battle-tested for edge cases (quotes, newlines, encoding)
- Client-side parsing (no server roundtrip) returns structured JSON with header mapping
- Excellent error reporting with row/column numbers for malformed data - critical for user feedback during bulk guest upload
- Streaming support for large files (if guest lists exceed 1000+ rows)

**Alternatives Considered**:
- **csv-parser**: Node.js streams API, not browser-compatible. Requires Webpack polyfills
- **d3-dsv**: Lightweight but no error handling or streaming. Too low-level for admin UI needs
- **xlsx (SheetJS)**: Overkill for CSV-only parsing. Large bundle size (500KB+)

**Integration**:
```typescript
import Papa from 'papaparse';

Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    // results.data = array of guest objects
    // results.errors = array with row numbers
  }
});
```

**Dependencies**: `papaparse`, `@types/papaparse`

---

## Decision 6: Build Tool

### Chosen: Vite 5.0+ with React Plugin

**Rationale**:
- Native ESM dev server with instant HMR (< 50ms updates). Best DX for TypeScript React apps
- Zero-config TypeScript support. Path aliases work out-of-box with tsconfig.json paths
- Optimized production builds with Rollup (tree-shaking, code splitting). Smaller bundles than CRA/Webpack
- First-class support for pnpm workspaces and monorepo setups

**Alternatives Considered**:
- **Create React App (CRA)**: Deprecated, no longer maintained. Webpack 4 is slow and outdated
- **Next.js**: Overkill for admin dashboard. SSR/SSG not needed (authenticated SPA). Adds unnecessary complexity
- **Custom Webpack**: Too much config boilerplate. Vite provides better DX with less setup

**Integration**:
- Initialize: `pnpm create vite@latest apps/admin-app --template react-ts`
- Configure `vite.config.ts` to resolve `@allstars/types` workspace package
- Firebase Hosting can serve Vite's `dist/` output directly

---

## Implementation Architecture

### Project Structure

```
apps/admin-app/
├── src/
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (Button, Input, etc.)
│   │   ├── questions/
│   │   │   ├── QuestionForm.tsx      # Dynamic form for create/edit
│   │   │   ├── QuestionList.tsx      # Data table with edit/delete
│   │   │   └── QuestionChoiceField.tsx  # Dynamic choice array field
│   │   ├── guests/
│   │   │   ├── GuestForm.tsx         # Single guest form
│   │   │   ├── GuestList.tsx         # Data table
│   │   │   ├── GuestCSVUpload.tsx    # CSV drag-drop + validation
│   │   │   └── GuestQRCode.tsx       # QR code component
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Nav sidebar + header
│   │   │   ├── ProtectedRoute.tsx    # Auth guard wrapper
│   │   │   └── PrintLayout.tsx       # Print-optimized wrapper
│   │   └── shared/
│   │       ├── ErrorBoundary.tsx
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── firebase.ts               # Firebase app initialization
│   │   ├── api-client.ts             # API server HTTP client
│   │   └── auth.ts                   # Firebase Auth helpers
│   ├── hooks/
│   │   ├── useAuth.ts                # Firebase Auth hook
│   │   ├── useQuestions.ts           # Questions CRUD hooks
│   │   └── useGuests.ts              # Guests CRUD hooks
│   ├── pages/
│   │   ├── LoginPage.tsx             # Google OAuth login
│   │   ├── DashboardPage.tsx         # Overview/stats
│   │   ├── QuestionsPage.tsx         # Question management
│   │   ├── GuestsPage.tsx            # Guest management
│   │   ├── QRCodePrintPage.tsx       # Print view for QR codes
│   │   └── SettingsPage.tsx          # Game config
│   ├── types/
│   │   └── api.ts                    # API response types
│   ├── utils/
│   │   ├── csv-parser.ts             # PapaParse wrapper
│   │   └── qr-generator.ts           # QR code URL generation
│   ├── App.tsx                       # Router + auth provider
│   └── main.tsx                      # Entry point
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Key Dependencies

**Core Framework**:
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `react-router-dom` ^6.20.0
- `typescript` ^5.3.2
- `vite` ^5.0.8
- `@vitejs/plugin-react` ^4.2.1

**Firebase**:
- `firebase` ^10.7.0 (client SDK for Auth + Firestore)

**Forms & Validation**:
- `react-hook-form` ^7.48.0
- `@hookform/resolvers` ^3.3.2
- `zod` ^3.22.4

**UI Components**:
- `@radix-ui/react-dialog` ^1.0.5
- `@radix-ui/react-dropdown-menu` ^2.0.6
- `@radix-ui/react-label` ^2.0.2
- `@radix-ui/react-select` ^2.0.0
- `@radix-ui/react-toast` ^1.1.5
- `tailwindcss` ^3.3.6
- `class-variance-authority` ^0.7.0
- `lucide-react` ^0.294.0 (icons)

**Utilities**:
- `qrcode.react` ^4.0.1
- `papaparse` ^5.4.1
- `@types/papaparse` ^5.3.12

**Workspace Dependencies**:
- `@allstars/types` workspace:*

### Development Workflow

**Local Development with Firebase Emulators**:

1. **Start Firebase Emulators** (from repo root):
   ```bash
   firebase emulators:start
   ```
   - Auth Emulator: `localhost:9099`
   - Firestore Emulator: `localhost:8080`
   - Functions (API server): `localhost:5001`
   - Emulator UI: `localhost:4000`

2. **Start Admin App Dev Server**:
   ```bash
   cd apps/admin-app
   pnpm dev
   ```
   - Runs on: `localhost:5173` (Vite default)

3. **Firebase SDK Configuration** (apps/admin-app/src/lib/firebase.ts):
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getAuth, connectAuthEmulator } from 'firebase/auth';
   import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

   const app = initializeApp({
     apiKey: "demo-project",
     projectId: "allstars-demo",
   });

   const auth = getAuth(app);
   const db = getFirestore(app);

   if (import.meta.env.DEV) {
     connectAuthEmulator(auth, 'http://localhost:9099');
     connectFirestoreEmulator(db, 'localhost', 8080);
   }

   export { auth, db };
   ```

4. **API Client Configuration** (apps/admin-app/src/lib/api-client.ts):
   ```typescript
   import { auth } from './firebase';

   const API_BASE_URL = import.meta.env.DEV
     ? 'http://localhost:5001/allstars-demo/us-central1'
     : 'https://us-central1-allstars-prod.cloudfunctions.net';

   export async function apiClient(endpoint: string, options: RequestInit = {}) {
     const idToken = await auth.currentUser?.getIdToken();

     return fetch(`${API_BASE_URL}${endpoint}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${idToken}`,
         ...options.headers,
       },
     });
   }
   ```

### Authentication Flow

1. **Login**: Use `signInWithPopup(auth, new GoogleAuthProvider())` for Google OAuth
2. **Admin Verification**: Call `GET /admin/verify` after login to confirm admin privileges
3. **Protected Routes**: Wrap admin pages with `<ProtectedRoute>` checking Firebase Auth state

### Image Upload Strategy

**Recommended Approach**: Firebase Storage with client-side upload

- Add `firebase/storage` SDK
- Upload images directly from browser to Cloud Storage bucket
- Store public download URL in Question document's `imageUrl` field
- Max file size: 5MB per image (enforced client-side and server-side)

### Print Layout CSS

```css
@media print {
  nav, header, .no-print { display: none; }
  .qr-code-card { page-break-after: always; }
  .qr-code-svg { width: 3in; height: 3in; }
}
```

---

## TypeScript Configuration

### apps/admin-app/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@allstars/types": ["../../packages/types/src"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/types" }
  ]
}
```

### apps/admin-app/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@allstars/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
});
```

---

## Summary

This technology stack provides:

✅ **Modern Developer Experience**: Vite HMR + TypeScript + React Hook Form enables fast iteration
✅ **Type Safety**: Shared Zod schemas between API and admin-app via `@allstars/types`
✅ **Firebase Integration**: Native SDK support for Auth, Firestore, and Cloud Functions
✅ **Admin-Focused UI**: shadcn/ui provides customizable, accessible components
✅ **Print Support**: SVG QR codes scale perfectly for physical printouts
✅ **Monorepo Friendly**: Vite + pnpm workspaces work seamlessly together

All libraries are actively maintained, have excellent TypeScript support, and integrate well with the existing Firebase/TypeScript/pnpm monorepo stack. The architecture supports incremental development (build auth → dashboard → questions → guests → QR codes → settings) and local testing with Firebase emulators.
