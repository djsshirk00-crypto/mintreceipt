import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useSpendingStats, CategorySpending } from '@/hooks/useSpendingStats';
import { useBudgetsWithSpending } from '@/hooks/useBudgets';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Color palette for pie chart slices
const CATEGORY_COLORS = [
  'hsl(142, 60%, 45%)',   // Green
  'hsl(210, 80%, 55%)',   // Blue
  'hsl(280, 70%, 55%)',   // Purple
  'hsl(30, 80%, 55%)',    // Orange
  'hsl(340, 70%, 55%)',   // Pink
  'hsl(180, 60%, 45%)',   // Teal
];

interface PieDataItem {
  name: string;
  value: number;
  icon: string;
  color: string;
  percentage: number;
  categoryData: CategorySpending;
  budget?: number;
  remaining?: number;
  isOverBudget?: boolean;
}

interface BudgetAwareLegendProps {
  data: PieDataItem[];
  onCategoryClick: (category: CategorySpending) => void;
}

function BudgetAwareLegend({ data, onCategoryClick }: BudgetAwareLegendProps) {
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry) => {
        // Calculate progress percentage
        const progressValue = entry.budget !== undefined 
          ? Math.min((entry.value / entry.budget) * 100, 100)
          : entry.percentage;
        
        const progressColor = entry.isOverBudget 
          ? 'hsl(var(--destructive))' 
          : entry.color;

        return (
          <button
            key={entry.name}
            onClick={() => onCategoryClick(entry.categoryData)}
            className="flex flex-col w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-h-[28px]">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-base">{entry.icon}</span>
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {entry.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.percentage.toFixed(0)}%
              </span>
              <span className="text-sm font-semibold text-foreground">
                ${entry.value.toFixed(0)}
              </span>
              {entry.budget !== undefined && entry.remaining !== undefined && (
                <span className={cn(
                  "text-xs font-medium",
                  entry.isOverBudget ? 'text-destructive' : 'text-success'
                )}>
                  ${Math.abs(entry.remaining).toFixed(0)} {entry.isOverBudget ? 'over' : 'left'}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            {/* Progress bar */}
            <div className="mt-2 w-full">
              <div 
                className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
              >
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${progressValue}%`,
                    backgroundColor: progressColor
                  }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SpendingBreakdownCard() {
  const navigate = useNavigate();
  const { data: spendingStats, isLoading } = useSpendingStats('this-month');
  
  // Get current month/year for budget data
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data: budgetsWithSpending } = useBudgetsWithSpending(month, year);

  // Create a map of category budgets
  const budgetMap = useMemo(() => {
    if (!budgetsWithSpending) return new Map();
    return new Map(budgetsWithSpending.map(b => [b.category_id, b]));
  }, [budgetsWithSpending]);

  const handleCategoryClick = useCallback((category: CategorySpending) => {
    navigate(`/category/${category.categoryId}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!spendingStats || spendingStats.categories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No spending data this month.</p>
        </CardContent>
      </Card>
    );
  }

  // Build pie data with budget info
  const pieData: PieDataItem[] = spendingStats.categories
    .filter(c => c.amount > 0)
    .map((c, index) => {
      const budget = budgetMap.get(c.categoryId);
      const hasBudget = budget && budget.amount > 0;
      
      return {
        name: c.categoryName,
        value: c.amount,
        icon: c.icon,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        percentage: spendingStats.total > 0 ? (c.amount / spendingStats.total) * 100 : 0,
        categoryData: c,
        budget: hasBudget ? budget.amount : undefined,
        remaining: hasBudget ? budget.remaining : undefined,
        isOverBudget: hasBudget ? budget.remaining < 0 : undefined,
      };
    });

  if (pieData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No spending data this month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Donut Chart */}
        <div className="h-56 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => handleCategoryClick(pieData[index].categoryData)}
                className="cursor-pointer"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">
                ${spendingStats.total.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Budget-Aware Legend */}
        <BudgetAwareLegend 
          data={pieData} 
          onCategoryClick={handleCategoryClick}
        />
      </CardContent>
    </Card>
  );
}
