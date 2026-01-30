import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadReceipt } from '@/hooks/useReceipts';

interface ReceiptUploaderProps {
  onUploadComplete?: () => void;
  compact?: boolean;
}

export function ReceiptUploader({ onUploadComplete, compact = false }: ReceiptUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const uploadReceipt = useUploadReceipt();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        await uploadReceipt.mutateAsync(file);
      }
      onUploadComplete?.();
    } finally {
      setUploading(false);
    }
  }, [uploadReceipt, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
    },
    disabled: uploading,
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          isDragActive && 'ring-2 ring-primary ring-offset-2',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
        <span className="font-medium">
          {uploading ? 'Uploading...' : 'Add Receipt'}
        </span>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative overflow-hidden rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200',
        isDragActive ? 'dropzone-active' : 'dropzone-idle',
        uploading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
          isDragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isDragActive ? (
            <Upload className="h-8 w-8" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {uploading
              ? 'Uploading receipt...'
              : isDragActive
              ? 'Drop your receipt here'
              : 'Drop receipt photo or click to upload'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {uploading
              ? 'Please wait while we save your receipt'
              : 'JPG, PNG, or HEIC • We\'ll handle the rest'}
          </p>
        </div>
      </div>
    </div>
  );
}
