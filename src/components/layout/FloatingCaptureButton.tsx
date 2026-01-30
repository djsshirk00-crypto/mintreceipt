import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function FloatingCaptureButton() {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useUploadReceipt();
  const navigate = useNavigate();

  const handleClick = () => {
    fileInputRef.current?.click();
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
      
      toast.success('Receipt uploaded! Processing...', {
        description: 'Head to Inbox to see your receipt.',
      });
      
      navigate('/inbox');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      
      <button
        onClick={handleClick}
        disabled={uploading}
        className={cn(
          'fixed bottom-20 right-4 z-40 md:hidden',
          'flex h-14 w-14 items-center justify-center',
          'rounded-full shadow-lg transition-all duration-200',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          uploading && 'opacity-80 cursor-wait'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Snap receipt"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
