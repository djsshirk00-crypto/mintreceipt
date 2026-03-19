import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { parseCSV, useImportTransactions, ParsedTransaction } from '@/hooks/useImport';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface ImportResult {
  imported: number;
  duplicates: number;
  merged: number;
  errors: number;
}

export function CSVImporter() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useImportTransactions();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsed = parseCSV(content);
        if (parsed.length === 0) {
          toast.error('No valid transactions found in file. Please check the format.');
          return;
        }
        setTransactions(parsed);
        setStep('preview');
      } catch (err) {
        toast.error('Failed to parse file. Please ensure it is a valid CSV.');
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    setStep('importing');
    try {
      const res = await importMutation.mutateAsync({
        transactions,
        fileName,
        importSource: 'csv',
      });
      setResult(res);
      setStep('done');
    } catch {
      setStep('preview');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep('upload');
      setTransactions([]);
      setFileName('');
      setResult(null);
    }, 300);
  };

  const debits = transactions.filter(t => t.type === 'debit');
  const credits = transactions.filter(t => t.type === 'credit');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV / QBO
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Import Transactions
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse — supports CSV, QBO exports, and bank statement downloads
              </p>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Supported formats:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>QuickBooks Online — Transaction List by Date export (.csv)</li>
                <li>Bank statements — Chase, Wells Fargo, Bank of America, etc.</li>
                <li>Any CSV with Date, Description, and Amount columns</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-medium text-foreground">Smart dedup:</span> Transactions matching
                existing receipt uploads (by date, amount, and merchant) will be automatically merged
                instead of duplicated.
              </p>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{debits.length} expenses</Badge>
                <Badge className="bg-emerald-100 text-emerald-700">{credits.length} income</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-80 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-24">Amount</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{tx.date}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{tx.description}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        ${tx.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            tx.type === 'credit'
                              ? 'border-emerald-300 text-emerald-600'
                              : 'border-red-300 text-red-600'
                          )}
                        >
                          {tx.type === 'credit' ? 'Income' : 'Expense'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-2">
                        ...and {transactions.length - 50} more transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-1">
                <X className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleImport} className="flex-1 gap-2">
                Import {transactions.length} Transactions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Importing ── */}
        {step === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
              <Upload className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="font-medium text-foreground">Importing transactions...</p>
            <p className="text-sm text-muted-foreground">
              Checking for duplicates and merging with existing receipts
            </p>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && result && (
          <div className="py-6 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-center font-semibold text-foreground text-lg">Import Complete!</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{result.imported}</p>
                <p className="text-xs text-muted-foreground">New transactions</p>
              </div>
              {result.merged > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{result.merged}</p>
                  <p className="text-xs text-muted-foreground">Merged with receipts</p>
                </div>
              )}
              {result.duplicates > 0 && (
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.duplicates}</p>
                  <p className="text-xs text-muted-foreground">Duplicates skipped</p>
                </div>
              )}
              {result.errors > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
