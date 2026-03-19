import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { useSavingsGoal, useSavingsRate, useUpsertSavingsGoal } from '@/hooks/useSavingsGoal';
import { cn } from '@/lib/utils';

export function SavingsGoalCard() {
  const year = new Date().getFullYear();
  const { data: goal, isLoading: goalLoading } = useSavingsGoal(year);
  const { data: rateData, isLoading: rateLoading } = useSavingsRate(year);
  const upsertGoal = useUpsertSavingsGoal();

  const [editing, setEditing] = useState(false);
  const [targetRate, setTargetRate] = useState<string>('20');

  const isLoading = goalLoading || rateLoading;

  const targetRateValue = goal?.target_rate ?? 20;
  const currentRate = rateData?.savingsRate ?? 0;
  const totalIncome = rateData?.totalIncome ?? 0;
  const totalSaved = rateData?.totalSaved ?? 0;
  const gap = rateData?.gap ?? 0;
  const monthlyGap = rateData?.monthlyGap ?? 0;

  const progressPct = targetRateValue > 0
    ? Math.min((currentRate / targetRateValue) * 100, 100)
    : 0;

  const isOnTrack = currentRate >= targetRateValue;
  const isClose = currentRate >= targetRateValue * 0.85;

  const statusColor = isOnTrack
    ? 'bg-emerald-100 text-emerald-700'
    : isClose
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';

  const statusLabel = isOnTrack ? '✅ On Track' : isClose ? '⚠️ Almost There' : '🎯 Behind Goal';

  const handleSaveGoal = async () => {
    const rate = parseFloat(targetRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    await upsertGoal.mutateAsync({ target_rate: rate, year });
    setEditing(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Savings Goal {year}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs font-medium', statusColor)}>
              {isLoading ? '...' : statusLabel}
            </Badge>
            {!editing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setTargetRate(String(targetRateValue));
                  setEditing(true);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target Rate Editor */}
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Target:</span>
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={targetRate}
              onChange={e => setTargetRate(e.target.value)}
              className="w-20 h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button
              size="icon"
              className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveGoal}
              disabled={upsertGoal.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditing(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {/* Rate Display */}
        <div className="flex items-end justify-between">
          {isLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div>
              <span className="text-3xl font-bold text-foreground">
                {currentRate.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">
                / {targetRateValue}% target
              </span>
            </div>
          )}
          {!isLoading && (
            <div className="text-right text-sm text-muted-foreground">
              <p>${totalSaved.toLocaleString()} saved</p>
              <p>of ${(totalIncome * targetRateValue / 100).toLocaleString()} goal</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isLoading ? (
          <Skeleton className="h-3 w-full" />
        ) : (
          <Progress
            value={progressPct}
            className={cn(
              'h-3',
              isOnTrack && '[&>div]:bg-emerald-500',
              isClose && !isOnTrack && '[&>div]:bg-yellow-500',
              !isClose && '[&>div]:bg-red-500'
            )}
          />
        )}

        {/* Gap Info */}
        {!isLoading && !isOnTrack && gap > 0 && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-1">
            <p className="text-xs font-medium text-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              To hit {targetRateValue}% this year:
            </p>
            <p className="text-xs text-muted-foreground">
              Save an additional{' '}
              <span className="font-semibold text-foreground">${gap.toLocaleString()}</span>
              {' '}total ({' '}
              <span className="font-semibold text-foreground">${monthlyGap.toFixed(0)}/mo</span>
              {' '}remaining)
            </p>
          </div>
        )}

        {!isLoading && isOnTrack && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              🎉 You're meeting your {targetRateValue}% savings goal!
            </p>
          </div>
        )}

        {/* Income baseline note */}
        {!isLoading && totalIncome === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Add income transactions to track your savings rate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
