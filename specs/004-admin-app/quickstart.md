# Quickstart: Admin Dashboard Development

**Feature**: 004-admin-app
**Target**: Frontend developers setting up local development environment
**Prerequisites**: Node.js 18+, pnpm 8+, Firebase CLI, Git

---

## Overview

This guide walks through setting up the admin-app development environment from scratch. You'll configure Firebase emulators, start the Vite dev server, and make your first admin dashboard CRUD operation.

**Time to Complete**: 15-20 minutes

---

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **pnpm 8+**
   ```bash
   pnpm --version  # Should be 8.0.0 or higher
   ```
   If not installed: `npm install -g pnpm`

3. **Firebase CLI**
   ```bash
   firebase --version  # Should be 11.0.0 or higher
   ```
   If not installed: `npm install -g firebase-tools`

4. **Git** (for cloning the monorepo)

### Firebase Project Setup

If you haven't already:

1. **Create Firebase project** at https://console.firebase.google.com
2. **Enable Authentication**: Go to Authentication > Sign-in method > Enable Google provider
3. **Create Firestore database**: Go to Firestore Database > Create database (start in test mode)
4. **Download service account key**:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `firebase-admin-key.json` (DO NOT commit to Git)

---

## Step 1: Clone and Install

```bash
# Clone the monorepo
git clone <repository-url>
cd allstars

# Install all dependencies (monorepo root)
pnpm install

# Verify workspace dependencies are linked
pnpm list @allstars/types  # Should show workspace link
```

**Checkpoint**: You should see all packages installed and workspace links created.

---

## Step 2: Configure Firebase Emulators

### 2.1 Initialize Emulators (if not done)

```bash
# From repo root
firebase init emulators

# Select:
# - Authentication Emulator (port 9099)
# - Firestore Emulator (port 8080)
# - Functions Emulator (port 5001)
```

### 2.2 Verify firebase.json

Ensure `/firebase.json` contains:

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### 2.3 Start Emulators

```bash
# Terminal 1 - Keep this running
firebase emulators:start
```

You should see:
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────┐
│ ✔  All emulators ready!                                │
│ View Emulator UI at http://localhost:4000              │
└─────────────────────────────────────────────────────────┘

┌───────────┬────────────────┐
│ Emulator  │ Port           │
├───────────┼────────────────┤
│ Auth      │ 9099           │
│ Firestore │ 8080           │
│ Functions │ 5001           │
│ Emulator UI│ 4000          │
└───────────┴────────────────┘
```

**Checkpoint**: Visit http://localhost:4000 - you should see the Firebase Emulator UI.

---

## Step 3: Set Up Admin App

### 3.1 Navigate to Admin App

```bash
cd apps/admin-app
```

### 3.2 Create Environment File

Create `.env.local` (this file is git-ignored):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=demo-project
VITE_FIREBASE_PROJECT_ID=allstars-demo
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_USE_EMULATORS=true

# API Server Base URL (Firebase Functions Emulator)
VITE_API_BASE_URL=http://localhost:5001/allstars-demo/us-central1

# Participant App URL (for QR code generation)
VITE_PARTICIPANT_APP_URL=http://localhost:5174
```

### 3.3 Install shadcn/ui Components (if not done)

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# When prompted:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Tailwind config: tailwind.config.js
# - Components location: src/components/ui

# Install required components
npx shadcn-ui@latest add button input label select textarea toast dialog dropdown-menu
```

### 3.4 Start Development Server

```bash
# Terminal 2 - Keep this running
pnpm dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Checkpoint**: Visit http://localhost:5173 - you should see the admin-app login page.

---

## Step 4: Configure Firebase SDK

### 4.1 Create Firebase Initialization

Create `apps/admin-app/src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { auth, db };
```

### 4.2 Create API Client

Create `apps/admin-app/src/lib/api-client.ts`:

```typescript
import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
```

---

## Step 5: Test Authentication

### 5.1 Create Login Component

Create `apps/admin-app/src/pages/LoginPage.tsx`:

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          AllStars Admin Dashboard
        </h1>
        <Button onClick={handleLogin} className="w-full">
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
```

### 5.2 Test Login Flow

1. Visit http://localhost:5173
2. Click "Sign in with Google"
3. You should see the Firebase emulator auth popup
4. Select "Add new account" and create a test user (e.g., `admin@example.com`)
5. After success, check the browser console for "Login successful!"

**Checkpoint**: You can successfully authenticate with Google via the Firebase emulator.

---

## Step 6: Create Your First CRUD Operation

### 6.1 Create Question Form Hook

Create `apps/admin-app/src/hooks/useQuestions.ts`:

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Question } from '@allstars/types';

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await apiClient<Question[]>('/admin/quizzes');
      setQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (questionData: Partial<Question>) => {
    const newQuestion = await apiClient<Question>('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
    setQuestions([...questions, newQuestion]);
    return newQuestion;
  };

  const updateQuestion = async (id: string, questionData: Partial<Question>) => {
    const updated = await apiClient<Question>(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
    setQuestions(questions.map(q => q.id === id ? updated : q));
    return updated;
  };

  const deleteQuestion = async (id: string) => {
    await apiClient(`/admin/quizzes/${id}`, { method: 'DELETE' });
    setQuestions(questions.filter(q => q.id !== id));
  };

  return {
    questions,
    loading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    refresh: fetchQuestions,
  };
}
```

### 6.2 Create Simple Question List Page

Create `apps/admin-app/src/pages/QuestionsPage.tsx`:

```typescript
import { useQuestions } from '@/hooks/useQuestions';
import { Button } from '@/components/ui/button';

export function QuestionsPage() {
  const { questions, loading, createQuestion } = useQuestions();

  const handleCreateTest = async () => {
    await createQuestion({
      period: 1,
      questionNumber: 1,
      type: 'four_choice',
      text: 'What is the capital of France?',
      choices: [
        { id: 'A', text: 'London' },
        { id: 'B', text: 'Paris' },
        { id: 'C', text: 'Berlin' },
        { id: 'D', text: 'Madrid' },
      ],
      correctAnswer: 'B',
      skipAttributes: [],
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Quiz Questions</h1>
      <Button onClick={handleCreateTest} className="mb-4">
        Create Test Question
      </Button>
      <div className="space-y-2">
        {questions.map(q => (
          <div key={q.id} className="p-4 border rounded">
            <span className="font-bold">Period {q.period}, Q{q.questionNumber}: </span>
            {q.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.3 Test CRUD Operation

1. Navigate to http://localhost:5173/questions (after setting up routing)
2. Click "Create Test Question"
3. Verify the question appears in the list
4. Check Firebase Emulator UI (http://localhost:4000) → Firestore → `questions` collection
5. You should see the new question document

**Checkpoint**: You can create a question and see it persisted in the emulator Firestore.

---

## Step 7: Verify Complete Setup

### 7.1 Directory Structure Checklist

```
apps/admin-app/
├── src/
│   ├── components/
│   │   └── ui/          ✓ shadcn/ui components
│   ├── lib/
│   │   ├── firebase.ts  ✓ Firebase initialization
│   │   └── api-client.ts ✓ API client
│   ├── hooks/
│   │   └── useQuestions.ts ✓ Questions CRUD hook
│   ├── pages/
│   │   ├── LoginPage.tsx ✓ Google login
│   │   └── QuestionsPage.tsx ✓ Question management
│   └── main.tsx
├── .env.local           ✓ Environment variables
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 7.2 Running Services Checklist

```
✓ Firebase Emulators (localhost:4000)
  - Auth: localhost:9099
  - Firestore: localhost:8080
  - Functions: localhost:5001

✓ Admin App Dev Server (localhost:5173)

✓ Can authenticate with Google (emulator)
✓ Can create questions via API
✓ Questions persist in Firestore emulator
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@allstars/types'"

**Solution**: Ensure pnpm workspaces are properly linked

```bash
# From repo root
pnpm install
cd apps/admin-app
pnpm list @allstars/types  # Should show workspace:*
```

### Issue 2: "Firebase auth popup blocked"

**Solution**: Allow popups for localhost in browser settings

- Chrome: Click icon in address bar → "Always allow popups from localhost"
- Firefox: Preferences → Privacy & Security → Permissions → Popups → Exceptions

### Issue 3: "CORS error when calling API"

**Solution**: Ensure Functions emulator allows CORS

In `apps/api-server/src/index.ts`:
```typescript
import * as cors from 'cors';

const app = express();
app.use(cors({ origin: true })); // Allow all origins in dev
```

### Issue 4: Tailwind CSS not working

**Solution**: Ensure Tailwind is configured correctly

`apps/admin-app/tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

`apps/admin-app/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Next Steps

Now that your environment is set up, you can:

1. **Build Question Form**: Implement full `QuestionForm.tsx` with React Hook Form + Zod validation
2. **Add Guest Management**: Create `GuestsPage.tsx` and `useGuests.ts` hook
3. **Implement QR Code Generation**: Add `GuestQRCode.tsx` component using `qrcode.react`
4. **Add CSV Upload**: Implement `GuestCSVUpload.tsx` with PapaParse
5. **Create Print Layout**: Build `QRCodePrintPage.tsx` with print-optimized CSS

Refer to [research.md](./research.md) for detailed implementation patterns and [data-model.md](./data-model.md) for entity schemas.

---

## Development Tips

### Hot Module Replacement

Vite provides instant HMR - changes to `.tsx` files reload in <50ms without losing state.

### Type Safety

Import types from `@allstars/types` for full type checking:

```typescript
import type { Question, CreateQuestionRequest } from '@allstars/types';
```

### Debugging Firebase

Use the Emulator UI (http://localhost:4000) to:
- Inspect Firestore documents
- View authentication tokens
- Monitor API function calls

### Testing Admin Privileges

For now, all authenticated users are admins in the emulator. In production, add custom claims:

```typescript
// In api-server (admin only)
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

---

## Resources

- **Vite Docs**: https://vitejs.dev
- **React Hook Form**: https://react-hook-form.com
- **shadcn/ui**: https://ui.shadcn.com
- **Firebase Emulator Suite**: https://firebase.google.com/docs/emulator-suite
- **Tailwind CSS**: https://tailwindcss.com

**Questions?** Check [research.md](./research.md) for architectural decisions or [contracts/api-server.yaml](./contracts/api-server.yaml) for API specifications.
