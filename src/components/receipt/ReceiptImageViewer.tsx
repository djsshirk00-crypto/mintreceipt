import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ImageOff } from 'lucide-react';

interface ReceiptImageViewerProps {
  imagePath: string | null;
}

export function ReceiptImageViewer({ imagePath }: ReceiptImageViewerProps) {
  const { signedUrl, loading, error } = useSignedUrl(imagePath);

  if (!imagePath) {
    return null;
  }

  const isPdf = imagePath.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Original Receipt</Label>
        {signedUrl && (
          <Button 
            variant="ghost" 
            size="sm" 
            asChild
          >
            <a 
              href={signedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Full Size
            </a>
          </Button>
        )}
      </div>
      <div className="rounded-lg overflow-hidden bg-muted border max-h-[500px] overflow-y-auto">
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : error || !signedUrl ? (
          <div className="w-full h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="h-12 w-12 mb-2" />
            <p className="text-sm">Unable to load image</p>
          </div>
        ) : isPdf ? (
          <iframe
            src={signedUrl}
            className="w-full h-[500px]"
            title="Receipt PDF"
          />
        ) : (
          <img 
            src={signedUrl} 
            alt="Receipt"
            className="w-full h-auto object-contain"
          />
        )}
      </div>
    </div>
  );
}
