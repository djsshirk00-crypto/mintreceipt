
# Fix: Mobile File Upload Flow

## Problem Summary

The "Upload Screenshot or PDF" button on mobile shows an **unnecessary preview screen** after file selection, causing users to get stuck. The user must tap "Use Photo" to actually upload, but:

1. This extra step is confusing and breaks the expected flow
2. PDFs cannot be previewed as images (blank/broken preview)
3. Users expect immediate upload like the FAB camera button provides

| Current Flow (Broken) | Expected Flow (Fixed) |
|----------------------|----------------------|
| Tap "Upload Screenshot or PDF" | Tap "Upload Screenshot or PDF" |
| Select file | Select file |
| **See blank/broken preview screen** | **Immediately upload** |
| Must tap "Use Photo" | Show loading indicator |
| Then navigates to Review | Navigate to Review |

---

## Solution

Refactor `MobileCameraCapture` to upload **immediately** after file selection, matching the behavior of `FloatingCaptureButton` and `ReceiptUploader`. Remove the preview screen entirely.

---

## Technical Changes

### File: `src/components/receipt/MobileCameraCapture.tsx`

**Remove:**
- The preview screen state (`capturedFile`, `previewUrl`)
- The preview UI (full-screen modal with Retake/Use Photo buttons)
- The two-step flow

**Add:**
- Immediate upload on file selection
- Loading state on the button itself
- Toast feedback for success/failure
- Direct navigation to `/review` after upload

### New Component Flow

```text
┌──────────────────────────────────────┐
│  📤  Upload Screenshot or PDF        │  ← User taps
└──────────────────────────────────────┘
                  ↓
        [File picker opens]
                  ↓
        User selects file & taps OK
                  ↓
┌──────────────────────────────────────┐
│  ⟳  Uploading...                     │  ← Button shows spinner
└──────────────────────────────────────┘
                  ↓
        Upload completes (1-2 seconds)
                  ↓
        Toast: "Receipt uploaded!"
                  ↓
        Navigate to /review
```

### Implementation

```tsx
export function MobileCameraCapture({ onClose }: MobileCameraCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useUploadReceipt();
  const navigate = useNavigate();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadReceipt.mutateAsync(file);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      toast.success('Receipt uploaded! Processing...');
      onClose?.();
      navigate('/review');
    } catch (error) {
      // Error handled in mutation hook
    } finally {
      setUploading(false);
      // Reset input for repeat selections
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  }, [uploadReceipt, onClose, navigate]);

  const openGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  // Single button - no preview screen
  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      
      <button
        onClick={openGallery}
        disabled={uploading}
        className={cn(
          'w-full flex items-center justify-center gap-3 p-4',
          'rounded-xl border-2 border-dashed border-primary/30',
          'bg-primary/5 hover:bg-primary/10 active:bg-primary/15 transition-colors',
          'cursor-pointer min-h-[52px]',
          uploading && 'opacity-70 cursor-wait'
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Image className="h-5 w-5" />
          )}
        </div>
        <div className="text-left">
          <p className="font-semibold text-foreground text-sm">
            {uploading ? 'Uploading...' : 'Upload Screenshot or PDF'}
          </p>
          {!uploading && (
            <p className="text-xs text-muted-foreground">From gallery or files</p>
          )}
        </div>
      </button>
    </>
  );
}
```

---

## Defensive Handling

| Scenario | Handling |
|----------|----------|
| User cancels file picker | `file` is undefined → early return, no action |
| Empty file array | Same as cancel → early return |
| Upload fails | Error toast shown by `useUploadReceipt` hook |
| Permission denied | Browser handles this before our code runs |
| PDF selected | Works the same as images - no preview needed |
| Multiple files | Currently single file, but could be extended |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/receipt/MobileCameraCapture.tsx` | Remove preview screen, upload immediately on file selection |

---

## Acceptance Criteria

- Selecting a file uploads immediately (within 1-2 seconds)
- User is taken directly to Review page
- No blank screens or intermediate modals
- Button shows loading indicator during upload
- Toast confirms upload success
- Works for JPG, PNG, and PDF
- Works consistently on Android and iOS mobile browsers
