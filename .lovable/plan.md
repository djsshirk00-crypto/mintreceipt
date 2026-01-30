

# Mobile-First Receipt Capture Experience

## Overview
This update transforms ReceiptFlow into a mobile-first experience, making it effortless to snap receipt photos on the go. The primary action becomes opening your phone's camera to capture a receipt with a single tap.

## What You'll Get

### 1. Direct Camera Capture
- A prominent "Snap Receipt" button that opens your phone's camera directly
- One-tap capture flow: tap button → take photo → auto-upload
- Falls back to photo gallery for desktop users or older devices

### 2. Mobile-Optimized Layout
- Floating Action Button (FAB) for instant receipt capture on mobile
- Larger touch targets throughout the app
- Bottom navigation already exists (good!) - we'll optimize it further
- Content padding adjusted for thumb-friendly scrolling

### 3. Quick Capture Flow
- After snapping, shows a quick preview with "Use Photo" or "Retake" options
- Auto-uploads and shows processing status immediately
- Haptic feedback (vibration) on successful capture (where supported)

### 4. PWA Enhancements for Mobile
- Add to Home Screen capability
- Proper mobile meta tags for native-like experience
- Camera permission handling with user-friendly prompts

---

## Technical Details

### 1. Camera Capture in ReceiptUploader

Update the `ReceiptUploader` component to detect mobile devices and prioritize camera capture:

```typescript
// Key changes to ReceiptUploader.tsx

// Add capture="environment" for direct camera access on mobile
<input 
  {...getInputProps()} 
  capture="environment"  // Opens rear camera directly on mobile
/>

// New state for camera flow
const [showPreview, setShowPreview] = useState(false);
const [capturedImage, setCapturedImage] = useState<File | null>(null);

// Mobile-specific UI with large camera button
{isMobile ? (
  <MobileCameraButton onClick={openCamera} />
) : (
  <DesktopDropzone {...dropzoneProps} />
)}
```

### 2. New Mobile Camera Component

Create `src/components/receipt/MobileCameraCapture.tsx`:

- Uses `capture="environment"` attribute for direct camera access
- Shows full-screen camera preview on capable devices
- Provides "Retake" and "Use Photo" actions
- Handles permissions gracefully with helpful error messages

### 3. Floating Action Button (FAB)

Add `src/components/layout/FloatingCaptureButton.tsx`:

- Fixed position button at bottom-right on mobile
- Large, thumb-friendly 56px circular button
- Camera icon with subtle pulse animation when idle
- Expands to show upload progress when capturing

### 4. Mobile-Optimized Page Layouts

Update layouts for mobile-first viewing:

**Dashboard.tsx changes:**
- Stack layout on mobile (no side-by-side cards)
- Larger status cards with touch-friendly spacing
- FAB for quick capture instead of prominent dropzone

**InboxPage.tsx changes:**
- Full-width receipt cards on mobile
- Swipe gestures for quick actions (future enhancement)
- Pull-to-refresh support

**BudgetPage.tsx changes:**
- Vertical layout for summary stats on mobile
- Larger touch targets on category cards
- Month navigation optimized for thumb reach

### 5. Enhanced index.html for Mobile

```html
<!-- Mobile-specific meta tags -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#4a7c59">

<!-- Viewport optimizations -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

<!-- App title and icons -->
<title>ReceiptFlow</title>
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
```

### 6. Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "ReceiptFlow",
  "short_name": "Receipts",
  "description": "Snap receipts, track spending",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf9f7",
  "theme_color": "#4a7c59",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### File Changes Summary

**New Files:**
- `src/components/receipt/MobileCameraCapture.tsx` - Mobile camera capture component
- `src/components/layout/FloatingCaptureButton.tsx` - FAB for quick capture
- `public/manifest.json` - PWA manifest

**Modified Files:**
- `src/components/receipt/ReceiptUploader.tsx` - Add camera capture support
- `src/components/layout/AppLayout.tsx` - Add FAB and mobile optimizations
- `src/pages/Dashboard.tsx` - Mobile-first layout
- `src/pages/InboxPage.tsx` - Mobile-first layout  
- `src/pages/BudgetPage.tsx` - Mobile-first layout
- `src/index.css` - Mobile utility classes and safe-area support
- `index.html` - Mobile meta tags and PWA setup

### Mobile UI Flow

```
User opens app on phone
         |
         v
[Dashboard with FAB visible]
         |
    Taps FAB
         |
         v
[Camera opens directly]
         |
    Snaps photo
         |
         v
[Quick preview screen]
    |           |
  Retake     Use Photo
    |           |
    v           v
[Camera]   [Upload starts]
                |
                v
         [Toast: "Processing..."]
                |
                v
         [Navigate to Inbox]
```

### CSS Additions

```css
/* Safe area support for notched phones */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

/* FAB positioning */
.fab {
  @apply fixed bottom-20 right-4 z-40 md:hidden;
  /* Above bottom nav, right side for thumb reach */
}

/* Mobile touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Prevent zoom on input focus (iOS) */
input, select, textarea {
  font-size: 16px;
}
```

### Camera Permissions Handling

The component will handle camera permissions gracefully:

1. First tap: Browser prompts for camera permission
2. If denied: Show helpful message with instructions to enable
3. If no camera: Fall back to file picker (photo gallery)

### Browser Compatibility

- **iOS Safari**: Full camera support via `capture="environment"`
- **Android Chrome**: Full camera support
- **Desktop browsers**: Falls back to file picker
- **Older browsers**: Standard file upload

