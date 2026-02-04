import { useRef, useState, useCallback } from 'react';
import { Image, PenLine, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ManualTransactionForm } from '@/components/receipt/ManualTransactionForm';

export function QuickActions() {
  const [uploading, setUploading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
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
  }, [uploadReceipt, navigate]);

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
      
      <div className="grid grid-cols-2 gap-3">
        {/* Add Receipt Button */}
        <button
          onClick={openGallery}
          disabled={uploading}
          className={cn(
            'flex items-center justify-center gap-2 p-4',
            'rounded-xl border border-border bg-card',
            'hover:bg-muted/50 active:scale-[0.98] transition-all',
            'cursor-pointer min-h-[52px]',
            uploading && 'opacity-70 cursor-wait'
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground text-sm">
              {uploading ? 'Uploading...' : 'Add Receipt'}
            </p>
          </div>
        </button>

        {/* Manual Entry Button */}
        <button
          onClick={() => setShowManualForm(true)}
          className={cn(
            'flex items-center justify-center gap-2 p-4',
            'rounded-xl border border-border bg-card',
            'hover:bg-muted/50 active:scale-[0.98] transition-all',
            'cursor-pointer min-h-[52px]'
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground flex-shrink-0">
            <PenLine className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground text-sm">Manual Entry</p>
          </div>
        </button>
      </div>

      {/* Manual Transaction Form (controlled mode) */}
      <ManualTransactionForm
        open={showManualForm}
        onOpenChange={setShowManualForm}
      />
    </>
  );
}
