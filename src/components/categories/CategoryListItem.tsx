import { ChevronRight, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Category, CategoryWithChildren } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategoryListItemProps {
  category: CategoryWithChildren | Category;
  isManageMode: boolean;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
  subcategoryCount?: number;
}

export function CategoryListItem({
  category,
  isManageMode,
  onTap,
  onEdit,
  onDelete,
  subcategoryCount = 0,
}: CategoryListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isManageMode && onTap()}
      onKeyDown={(e) => e.key === 'Enter' && !isManageMode && onTap()}
      className={cn(
        "flex items-center gap-3 px-4 min-h-[52px] bg-card border-b border-border last:border-b-0",
        "transition-colors active:bg-muted/50",
        !isManageMode && "cursor-pointer hover:bg-muted/30",
        isManageMode && "cursor-default bg-muted/20"
      )}
    >
      {/* Drag handle in manage mode */}
      {isManageMode && (
        <div className="flex items-center justify-center w-8 h-8 -ml-1 touch-none cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Icon */}
      <span className="text-2xl flex-shrink-0">{category.icon}</span>

      {/* Name and subcategory count */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground block truncate">
          {category.name}
        </span>
        {subcategoryCount > 0 && !isManageMode && (
          <span className="text-xs text-muted-foreground">
            {subcategoryCount} subcategor{subcategoryCount === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      {/* Actions based on mode */}
      {isManageMode ? (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
            aria-label="Edit category"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
            aria-label="Delete category"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ) : (
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}
