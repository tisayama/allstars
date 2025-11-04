# Deployment Guide - AllStars Host Control App

Complete guide for deploying the host-app to production.

## Prerequisites

- ✅ Firebase project created and configured
- ✅ Backend API deployed with host-action endpoints
- ✅ Domain/hosting service set up (Firebase Hosting, Netlify, Vercel, etc.)
- ✅ Sentry project created (optional but recommended)
- ✅ Node.js >= 18.0.0 installed
- ✅ pnpm or npm installed

## Pre-Deployment Checklist

### 1. Firebase Configuration

- [ ] Firebase Auth enabled in console
- [ ] Google sign-in provider configured
- [ ] Authorized domains added:
  - Your production domain (e.g., `host.yourapp.com`)
  - Localhost for testing (`localhost`, `127.0.0.1`)
- [ ] Firestore database created
- [ ] Firestore security rules deployed
- [ ] Firebase Admin SDK credentials configured (backend)

### 2. Backend API

- [ ] Backend API deployed to Cloud Functions or equivalent
- [ ] Host action endpoint available: `POST /api/host-action/{sessionId}`
- [ ] Authentication middleware configured to verify Firebase ID tokens
- [ ] API responds with correct CORS headers
- [ ] Test endpoint accessible: `GET /api/session/{sessionId}/validate`

### 3. Environment Variables

- [ ] All required environment variables documented
- [ ] Production Firebase config obtained from Firebase Console
- [ ] API base URL determined
- [ ] Sentry DSN obtained (if using Sentry)

### 4. Code Review

- [ ] All tests passing: `pnpm test:unit`
- [ ] Build successful: `pnpm run build`
- [ ] No console errors in production build
- [ ] Bundle size acceptable (~228KB gzipped)
- [ ] Lint warnings reviewed: `pnpm lint`

---

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

**Pros**: Same infrastructure as Firebase Auth/Firestore, free tier, automatic SSL

#### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

#### Step 2: Initialize Firebase Hosting

```bash
# From project root
cd apps/host-app
firebase init hosting
```

Configuration:
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub Actions: `Optional`

#### Step 3: Configure Environment Variables

Create `apps/host-app/.env.production`:

```env
VITE_FIREBASE_API_KEY=YOUR_PRODUCTION_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_BASE_URL=https://us-central1-your-project.cloudfunctions.net
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/12345
VITE_USE_EMULATOR=false
```

#### Step 4: Build

```bash
pnpm run build
```

#### Step 5: Deploy

```bash
firebase deploy --only hosting
```

#### Step 6: Verify

Visit your Firebase Hosting URL (e.g., `https://your-project.web.app`)

---

### Option 2: Netlify

**Pros**: Easy setup, automatic deployments from Git, free tier

#### Step 1: Build Configuration

Create `netlify.toml` in `apps/host-app/`:

```toml
[build]
  command = "pnpm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### Step 2: Deploy via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
```

#### Step 3: Set Environment Variables

In Netlify dashboard:
- Site settings → Build & deploy → Environment variables
- Add all `VITE_*` variables

#### Step 4: Deploy

```bash
netlify deploy --prod
```

---

### Option 3: Vercel

**Pros**: Fast CDN, serverless functions support, free tier

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

#### Step 2: Deploy

```bash
cd apps/host-app
vercel --prod
```

#### Step 3: Set Environment Variables

```bash
# Via CLI
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
# ... etc

# Or via dashboard: vercel.com → project → Settings → Environment Variables
```

#### Step 4: Redeploy with Env Vars

```bash
vercel --prod
```

---

## Post-Deployment Verification

### 1. Functional Testing

- [ ] Visit production URL
- [ ] Google Sign-In works
- [ ] Session authentication persists after page reload
- [ ] Connect to test game session
- [ ] Real-time state updates display correctly
- [ ] Action buttons appear based on phase
- [ ] Trigger test action (verify API call)
- [ ] Check Sentry for any errors
- [ ] Test logout functionality
- [ ] Verify protected routes redirect to login

### 2. Performance Testing

- [ ] Page load time < 3 seconds (first visit)
- [ ] Page load time < 1 second (cached)
- [ ] Real-time updates < 500ms latency
- [ ] API responses < 2 seconds
- [ ] No console errors in production
- [ ] No memory leaks (check DevTools)

### 3. Device Testing

- [ ] Test on iPad Pro (portrait)
- [ ] Test on iPad Pro (landscape)
- [ ] Test on Android tablet
- [ ] Test on desktop browser (fallback)
- [ ] Touch targets >= 44px
- [ ] Text readable at tablet distance

### 4. Error Scenarios

- [ ] Network disconnection (should auto-reconnect)
- [ ] Invalid session ID (should show error)
- [ ] API timeout (should show error + retry)
- [ ] Expired token (should refresh automatically)
- [ ] Invalid action for phase (should prevent + show error)

---

## Monitoring & Maintenance

### Sentry Setup

1. Create Sentry project: https://sentry.io
2. Copy DSN to `VITE_SENTRY_DSN`
3. Redeploy with new env var
4. Verify events appearing in Sentry dashboard

### Recommended Alerts

Set up Sentry alerts for:
- API request failures (threshold: > 5 per hour)
- Authentication failures (threshold: > 10 per hour)
- Firestore connection failures (threshold: > 3 per hour)
- New error types (immediate notification)

### Logging Review

Check Sentry for:
- Authentication events (login success/failure)
- API request failures
- Game state transitions
- Firestore connection issues

### Performance Monitoring

Monitor:
- Firebase Auth latency
- Firestore read/write operations
- API endpoint response times
- Bundle size (should stay < 1MB)

---

## Rollback Procedure

### Firebase Hosting

```bash
# List previous releases
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Netlify

- Dashboard → Deploys → Previous deploy → "Publish deploy"

### Vercel

- Dashboard → Deployments → Previous deployment → "Promote to Production"

---

## Troubleshooting

### Issue: "Not authenticated" errors

**Cause**: Firebase Auth domain not authorized

**Fix**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your production domain
3. Wait 5-10 minutes for propagation

### Issue: API requests failing with CORS errors

**Cause**: Backend API CORS configuration

**Fix**:
1. Ensure backend API allows origin: `https://your-production-domain.com`
2. Check CORS headers include:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
   - `Access-Control-Allow-Headers: Authorization, Content-Type`

### Issue: Real-time updates not working

**Cause**: Firestore security rules

**Fix**:
1. Check Firestore rules allow authenticated reads:
```javascript
match /game-sessions/{sessionId} {
  allow read: if request.auth != null;
}
```
2. Verify user is authenticated
3. Check browser console for Firestore errors

### Issue: Bundle size too large (> 1MB)

**Fix**:
1. Check dependencies: `pnpm list --depth=0`
2. Remove unused imports
3. Enable tree shaking in Vite config
4. Consider lazy loading routes

---

## Security Checklist

- [ ] Firebase Auth production keys (not emulator keys)
- [ ] HTTPS enforced on production domain
- [ ] Firebase security rules deployed and tested
- [ ] API requires authentication (Bearer token)
- [ ] No sensitive data in localStorage (only tokens)
- [ ] Content Security Policy headers configured
- [ ] Rate limiting on API endpoints
- [ ] Sentry PII scrubbing enabled

---

## Maintenance Schedule

### Daily
- Review Sentry errors
- Check API response times

### Weekly
- Review Firebase Auth usage
- Check Firestore read/write counts
- Review deployment logs

### Monthly
- Update dependencies: `pnpm update`
- Review bundle size
- Performance audit
- Security audit

### Quarterly
- Major dependency updates
- Firebase SDK version check
- Browser compatibility testing
- Load testing

---

## Scaling Considerations

### Current Limits (v1.0)
- 1 session per host at a time
- Firestore real-time listeners (1 per host)
- API rate limits depend on backend configuration

### Future Scaling
- Consider Redis caching for game state
- Implement connection pooling
- Add CDN for static assets
- Optimize Firestore reads with caching
- Implement pagination for large datasets

---

## Contacts & Support

**Technical Issues**:
- Check Sentry dashboard first
- Review Firebase Console logs
- Check backend API logs

**Deployment Issues**:
- Refer to hosting provider documentation
- Check this DEPLOYMENT.md guide
- Review TROUBLESHOOTING section in README.md

---

## Deployment Checklist Summary

**Before Deployment:**
- [ ] All tests passing
- [ ] Build successful
- [ ] Environment variables configured
- [ ] Firebase project configured
- [ ] Backend API deployed

**During Deployment:**
- [ ] Production build created
- [ ] Environment variables set on hosting
- [ ] Deploy command executed
- [ ] Deployment successful

**After Deployment:**
- [ ] Functional testing complete
- [ ] Performance testing complete
- [ ] Device testing complete
- [ ] Error scenarios tested
- [ ] Monitoring configured
- [ ] Team notified of deployment

---

## Quick Deploy Commands

```bash
# 1. Pull latest code
git pull origin main

# 2. Navigate to host-app
cd apps/host-app

# 3. Install dependencies
pnpm install

# 4. Run tests
pnpm test:unit

# 5. Build production
pnpm run build

# 6. Deploy (choose one)
firebase deploy --only hosting  # Firebase
netlify deploy --prod           # Netlify
vercel --prod                   # Vercel

# 7. Verify deployment
curl https://your-production-url.com
```

---

## Success! 🎉

Your AllStars Host Control App is now deployed and ready for production use!

**Next Steps:**
1. Share production URL with authorized hosts
2. Monitor Sentry for first-time user issues
3. Gather feedback from initial users
4. Plan next release features

**Need Help?**
- See README.md for usage instructions
- See CHANGELOG.md for version history
- Check Sentry for error tracking
