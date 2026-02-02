import { useRef, useState, useCallback } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MobileCameraCaptureProps {
  onClose?: () => void;
}

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
