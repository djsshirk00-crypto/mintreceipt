import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Home, Plus, TrendingUp, TrendingDown, DollarSign, Building2, Pencil, Trash2,
} from 'lucide-react';
import {
  useRentalProperties,
  useAllRentalSummary,
  useRentalPropertySummary,
  useAddRentalProperty,
  useUpdateRentalProperty,
  useDeleteRentalProperty,
  RentalProperty,
} from '@/hooks/useRentalProperties';
import { AddIncomeForm } from '@/components/income/AddIncomeForm';
import { cn } from '@/lib/utils';

// ── Add/Edit Property Dialog ───────────────────────────────────────────────
function PropertyDialog({
  property,
  open,
  onOpenChange,
}: {
  property?: RentalProperty;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const addProperty = useAddRentalProperty();
  const updateProperty = useUpdateRentalProperty();

  const [name, setName] = useState(property?.name || '');
  const [address, setAddress] = useState(property?.address || '');
  const [mortgage, setMortgage] = useState(String(property?.mortgage_amount || ''));
  const [notes, setNotes] = useState(property?.notes || '');

  const isEditing = !!property;

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      mortgage_amount: parseFloat(mortgage) || 0,
      notes: notes.trim() || null,
    };
    if (isEditing) {
      await updateProperty.mutateAsync({ id: property.id, ...payload });
    } else {
      await addProperty.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Property' : 'Add Rental Property'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Property Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 147 Main St" />
          </div>
          <div className="space-y-1.5">
            <Label>Address (optional)</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Mortgage ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={mortgage}
              onChange={e => setMortgage(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={addProperty.isPending || updateProperty.isPending}
            >
              {isEditing ? 'Save Changes' : 'Add Property'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Property Detail Card ───────────────────────────────────────────────────
function PropertyCard({ property }: { property: RentalProperty }) {
  const year = new Date().getFullYear();
  const { data: summary, isLoading } = useRentalPropertySummary(property.id, year);
  const deleteProperty = useDeleteRentalProperty();
  const [editOpen, setEditOpen] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);

  const netIncome = summary?.netIncome ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const totalMortgage = summary?.totalMortgage ?? 0;
  const coverageRatio = totalMortgage > 0 ? (totalIncome / totalMortgage) * 100 : 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">{property.name}</CardTitle>
                {property.address && (
                  <p className="text-xs text-muted-foreground">{property.address}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteProperty.mutate(property.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-center">
              {isLoading ? <Skeleton className="h-5 w-14 mx-auto" /> : (
                <p className="text-sm font-bold text-emerald-700">
                  ${totalIncome.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Income</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 text-center">
              {isLoading ? <Skeleton className="h-5 w-14 mx-auto" /> : (
                <p className="text-sm font-bold text-red-700">
                  ${totalMortgage.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Mortgage</p>
            </div>
            <div className={cn(
              'rounded-lg p-2.5 text-center',
              netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'
            )}>
              {isLoading ? <Skeleton className="h-5 w-14 mx-auto" /> : (
                <p className={cn(
                  'text-sm font-bold',
                  netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'
                )}>
                  {netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Net</p>
            </div>
          </div>

          {/* Coverage Ratio */}
          {!isLoading && totalMortgage > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mortgage coverage</span>
                <span className={cn(
                  'font-medium',
                  coverageRatio >= 100 ? 'text-emerald-600' : 'text-orange-600'
                )}>
                  {coverageRatio.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={Math.min(coverageRatio, 100)}
                className={cn(
                  'h-2',
                  coverageRatio >= 100 && '[&>div]:bg-emerald-500',
                  coverageRatio < 100 && '[&>div]:bg-orange-500'
                )}
              />
              <p className="text-xs text-muted-foreground">
                Monthly: ${(property.mortgage_amount || 0).toLocaleString()} mortgage
              </p>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            onClick={() => setAddIncomeOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Log Rent Payment
          </Button>
        </CardContent>
      </Card>

      <PropertyDialog property={property} open={editOpen} onOpenChange={setEditOpen} />
      <AddIncomeForm
        open={addIncomeOpen}
        onOpenChange={setAddIncomeOpen}
        defaultType="rental"
      />
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RentalPropertiesPage() {
  const { data: properties, isLoading } = useRentalProperties();
  const { data: summary } = useAllRentalSummary();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rental Properties</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track income and expenses for each property.
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Portfolio Summary */}
        {summary && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Portfolio Summary — {new Date().getFullYear()} YTD
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-lg font-bold text-emerald-700">
                    ${summary.totalIncome.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Income</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-700">
                    ${summary.totalMortgage.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Mortgage</p>
                </div>
                <div>
                  <p className={cn(
                    'text-lg font-bold',
                    summary.totalNet >= 0 ? 'text-blue-700' : 'text-orange-700'
                  )}>
                    {summary.totalNet >= 0 ? '+' : ''}${summary.totalNet.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Net Income</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Property Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="space-y-4">
            {properties.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <Home className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-foreground">No properties yet</p>
              <p className="text-sm text-muted-foreground">
                Add your rental properties to track income and mortgage payments.
              </p>
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Property
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <PropertyDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppLayout>
  );
}
