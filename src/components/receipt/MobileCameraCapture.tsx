import { useRef, useState, useCallback } from 'react';
import { Camera, Loader2, X, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MobileCameraCaptureProps {
  onClose?: () => void;
}

export function MobileCameraCapture({ onClose }: MobileCameraCaptureProps) {
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useUploadReceipt();
  const navigate = useNavigate();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedFile(null);
    setPreviewUrl(null);
    // Reset and trigger file input again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [previewUrl]);

  const handleUsePhoto = useCallback(async () => {
    if (!capturedFile) return;

    setUploading(true);
    try {
      await uploadReceipt.mutateAsync(capturedFile);
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      toast.success('Receipt uploaded! Processing...');
      
      // Clean up
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      onClose?.();
      navigate('/inbox');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  }, [capturedFile, previewUrl, uploadReceipt, onClose, navigate]);

  const handleCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedFile(null);
    setPreviewUrl(null);
    onClose?.();
  }, [previewUrl, onClose]);

  const openCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // If we have a preview, show the preview screen
  if (previewUrl && capturedFile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-5 w-5" />
          </Button>
          <span className="font-medium text-foreground">Preview</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Image preview */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-muted/30">
          <img
            src={previewUrl}
            alt="Captured receipt"
            className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Action buttons */}
        <div 
          className="flex items-center justify-center gap-4 p-4 border-t border-border bg-background"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handleRetake}
            disabled={uploading}
            className="flex-1 max-w-40"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Retake
          </Button>
          <Button
            size="lg"
            onClick={handleUsePhoto}
            disabled={uploading}
            className="flex-1 max-w-40"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Use Photo
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Initial state - show camera trigger
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={openCamera}
        className={cn(
          'w-full flex flex-col items-center justify-center gap-3 p-8',
          'rounded-xl border-2 border-dashed border-primary/30',
          'bg-primary/5 hover:bg-primary/10 transition-colors',
          'cursor-pointer touch-target'
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Camera className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Snap Receipt</p>
          <p className="text-sm text-muted-foreground">Tap to open camera</p>
        </div>
      </button>
    </>
  );
}
