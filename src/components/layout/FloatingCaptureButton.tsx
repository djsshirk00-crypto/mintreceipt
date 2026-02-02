import { useRef, useState } from 'react';
import { Camera, Loader2, PenLine, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ManualTransactionForm } from '@/components/receipt/ManualTransactionForm';

export function FloatingCaptureButton() {
  const [uploading, setUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useUploadReceipt();
  const navigate = useNavigate();

  const handleCameraClick = () => {
    fileInputRef.current?.click();
    setIsExpanded(false);
  };

  const handleManualClick = () => {
    setShowManualForm(true);
    setIsExpanded(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadReceipt.mutateAsync(file);
      }
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      toast.success('Receipt uploaded! Processing in background...', {
        description: 'Head to Review to finalize.',
      });
      
      // Navigate directly to Review page (no more Inbox)
      navigate('/review');
    } catch (error) {
      // Error already handled in mutation
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleExpand = () => {
    if (!uploading) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* FAB Container */}
      <div data-tour="fab" className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col-reverse items-center gap-3">
        {/* Secondary buttons - shown when expanded */}
        <div className={cn(
          'flex flex-col-reverse gap-3 transition-all duration-200',
          isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}>
          {/* Camera button */}
          <button
            onClick={handleCameraClick}
            disabled={uploading}
            className={cn(
              'flex h-12 w-12 items-center justify-center',
              'rounded-full shadow-lg transition-all duration-200',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            aria-label="Snap receipt"
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* Manual entry button */}
          <button
            onClick={handleManualClick}
            className={cn(
              'flex h-12 w-12 items-center justify-center',
              'rounded-full shadow-lg transition-all duration-200',
              'bg-secondary text-secondary-foreground',
              'hover:bg-secondary/90 active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            aria-label="Add manual entry"
          >
            <PenLine className="h-5 w-5" />
          </button>
        </div>

        {/* Main FAB */}
        <button
          onClick={toggleExpand}
          disabled={uploading}
          className={cn(
            'flex h-14 w-14 items-center justify-center',
            'rounded-full shadow-lg transition-all duration-200',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            uploading && 'opacity-80 cursor-wait',
            isExpanded && 'rotate-45'
          )}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          aria-label={isExpanded ? 'Close menu' : 'Add receipt'}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isExpanded ? (
            <X className="h-6 w-6 transition-transform" />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Manual Transaction Dialog */}
      <ManualTransactionForm 
        open={showManualForm} 
        onOpenChange={setShowManualForm}
      />
    </>
  );
}
