# AllStars Admin Dashboard

Web-based administration interface for managing the AllStars Quiz Game platform. Event organizers use this dashboard to create quiz questions, manage guest registrations, generate QR codes, and configure game settings.

## Features

### 🔐 Authentication
- Google OAuth login for administrators
- Automatic token refresh
- Protected routes with authentication guards

### 📊 Dashboard
- Real-time statistics (question count, guest count)
- Quick navigation to all management features
- Overview of event preparation status

### ❓ Quiz Management
- Create, edit, and delete quiz questions
- Support for multiple-choice questions (2-6 choices)
- Period-based organization (first-half, second-half, overtime)
- Skip attributes for targeted questions
- Search and filter by period
- Deadline configuration for each question

### 👥 Guest Management
- Add guests individually or via CSV bulk upload
- CSV template with sample data provided
- Real-time validation with row-specific error messages
- Guest attributes for question filtering
- Table number assignment
- Search by name or attributes

### 📱 QR Code Generation
- Generate unique QR codes for all registered guests
- Print-optimized layout for physical cards
- URL format: `{PARTICIPANT_APP_URL}/join?token={token}`
- 200x200px QR codes with high error correction (Level H)
- A4 page layout with page-break optimization

### ⚙️ Game Configuration
- Configure default dropout rules (period vs worst_one)
- Configure default ranking rules (time vs point)
- Firestore merge operations to preserve game state
- Settings stored in gameState/live document

## Tech Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.0
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4.0
- **Forms**: React Hook Form 7.66.0 + Zod 3.22.0
- **Routing**: React Router DOM 6.20.0
- **Firebase**: Firebase SDK 10.7.0 (Auth, Firestore, Storage, Functions)
- **CSV**: PapaParse 5.4.0
- **QR Codes**: qrcode.react 4.0.0
- **Testing**: Vitest 1.0.0 + React Testing Library 14.0.0

## Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm
- Firebase project with Authentication, Firestore, and Cloud Functions enabled
- AllStars API server running (see `/apps/api-server`)

## Installation

1. **Install dependencies** from the monorepo root:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp apps/admin-app/.env.example apps/admin-app/.env
   ```

3. **Edit `.env` file** with your configuration:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_USE_EMULATORS=true  # Set to false for production

   # API Server Base URL
   VITE_API_BASE_URL=http://localhost:5001/your-project/us-central1

   # Participant App URL (REQUIRED)
   VITE_PARTICIPANT_APP_URL=http://localhost:5174
   ```

   **⚠️ Important**: `VITE_PARTICIPANT_APP_URL` must be set for QR code generation to work.

## Development

### Run Development Server

From the monorepo root:
```bash
cd apps/admin-app
pnpm dev
```

The app will be available at `http://localhost:5173`

### Run with Firebase Emulators

1. Start the Firebase emulators (from project root):
   ```bash
   firebase emulators:start
   ```

2. In another terminal, start the admin app:
   ```bash
   cd apps/admin-app
   pnpm dev
   ```

The app will automatically connect to:
- Auth Emulator: `http://localhost:9099`
- Firestore Emulator: `localhost:8080`
- Storage Emulator: `localhost:9199`
- Functions Emulator: `http://localhost:5001`

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
```

### Lint and Format

```bash
# Run ESLint
pnpm lint

# Format code with Prettier
pnpm format
```

## Building for Production

```bash
# Build the application
pnpm build

# Preview production build
pnpm preview
```

The build output will be in `dist/` directory.

## Deployment

### Deploy to Firebase Hosting

1. **Build the application**:
   ```bash
   pnpm build
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting:admin
   ```

3. **Configure production environment variables**:
   - Update Firebase Hosting environment configuration
   - Ensure `VITE_PARTICIPANT_APP_URL` points to production participant app
   - Set `VITE_USE_EMULATORS=false`

## Project Structure

```
apps/admin-app/
├── public/
│   └── guest-template.csv          # CSV template for bulk guest import
├── src/
│   ├── components/
│   │   ├── guests/                 # Guest management components
│   │   │   ├── GuestForm.tsx
│   │   │   ├── GuestList.tsx
│   │   │   ├── GuestCSVUpload.tsx
│   │   │   └── GuestQRCode.tsx
│   │   ├── layout/                 # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PrintLayout.tsx
│   │   ├── questions/              # Question management components
│   │   │   ├── QuestionForm.tsx
│   │   │   └── QuestionList.tsx
│   │   └── shared/                 # Shared/common components
│   │       ├── ErrorBoundary.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useQuestions.ts
│   │   ├── useGuests.ts
│   │   └── useSettings.ts
│   ├── lib/                        # Core utilities
│   │   ├── firebase.ts             # Firebase SDK initialization
│   │   ├── api-client.ts           # HTTP client with auth
│   │   └── auth.ts                 # Auth helpers
│   ├── pages/                      # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── QuizzesPage.tsx
│   │   ├── GuestsPage.tsx
│   │   ├── QRCodePrintPage.tsx
│   │   └── SettingsPage.tsx
│   ├── utils/                      # Utility functions
│   │   ├── csv-parser.ts           # CSV parsing with validation
│   │   └── qr-generator.ts         # QR code URL generation
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── tests/                          # Test files
│   ├── unit/
│   ├── component/
│   └── integration/
├── .env.example                    # Environment variable template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

## Key Workflows

### Creating Quiz Questions

1. Navigate to **Quiz Management**
2. Click **"Add Question"**
3. Fill in the form:
   - Period (first-half, second-half, overtime)
   - Question number
   - Question text
   - Answer choices (2-6 choices)
   - Correct answer
   - Skip attributes (optional)
   - Deadline
4. Click **"Create Question"**

### Importing Guests via CSV

1. Navigate to **Guest Management**
2. Click **"Upload CSV"**
3. Download the template CSV (if needed)
4. Prepare your CSV file with columns: `Name`, `TableNumber`, `Attributes`
5. Upload the file
6. Review validation results
7. Click **"Import Guests"** if validation passes

**CSV Format Example**:
```csv
Name,TableNumber,Attributes
John Doe,5,"groom_friend,speech_guest"
Jane Smith,3,bride_family
Robert Johnson,7,""
```

### Printing QR Codes

1. Navigate to **Guest Management**
2. Ensure guests are registered
3. Click **"Print All QR Codes"**
4. Review the print preview
5. Click **"Print QR Codes"** button
6. Use browser's print dialog to print or save as PDF

### Configuring Game Settings

1. Navigate to **Settings**
2. Select **Default Dropout Rule**:
   - "Period-based" - Drop out at end of each period
   - "Worst One" - Drop slowest/worst after each question
3. Select **Default Ranking Rule**:
   - "Time-based" - Fastest correct answers win
   - "Point-based" - Most points win
4. Click **"Save Settings"**

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase project API key |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `VITE_API_BASE_URL` | Yes | API server base URL (Firebase Functions) |
| `VITE_PARTICIPANT_APP_URL` | Yes | Participant app URL for QR codes |
| `VITE_USE_EMULATORS` | No | Set to "true" for local development with emulators |

## Troubleshooting

### "VITE_PARTICIPANT_APP_URL is not configured" Error

**Solution**: Ensure the environment variable is set in your `.env` file and restart the dev server.

### QR Codes Not Generating

**Solution**:
1. Check that `VITE_PARTICIPANT_APP_URL` is set
2. Verify guests are registered
3. Check browser console for errors

### CSV Upload Validation Errors

**Solution**:
1. Download the template CSV from the upload page
2. Ensure column names match exactly: `Name`, `TableNumber`, `Attributes`
3. Check that table numbers are positive integers
4. Verify CSV file encoding is UTF-8

### Authentication Issues

**Solution**:
1. For development: Ensure Firebase emulators are running
2. For production: Verify Firebase project settings
3. Clear browser cookies and try again
4. Check Firebase Console for authentication logs

## Performance Optimization

The app includes several optimizations:

- **Code Splitting**: Pages are lazy-loaded for faster initial load
- **Memoization**: Search/filter results are cached with `useMemo`
- **Bundle Size**: 580KB (gzipped: 160KB)

## Testing

Test coverage includes:

- **Unit Tests**: Hooks, utilities, validation logic
- **Component Tests**: Forms, lists, UI components
- **Integration Tests**: Authentication flows, CRUD operations

Run tests with:
```bash
pnpm test
```

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update this README for significant changes
4. Ensure build passes: `pnpm build`

## License

[Your License Here]

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Firebase Console logs
- Check browser console for client-side errors
- Review API server logs for backend issues

---

**Built with ❤️ for AllStars Quiz Game**
