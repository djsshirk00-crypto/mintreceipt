import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Category, CategoryWithChildren, useDeleteCategory } from '@/hooks/useCategories';
import { Plus, MoreVertical, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface CategoryDetailSheetProps {
  category: CategoryWithChildren | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (category: Category) => void;
  onAddSubcategory: (parentId: string, type: 'expense' | 'income') => void;
  onEditSubcategory: (subcategory: Category) => void;
}

export function CategoryDetailSheet({
  category,
  open,
  onOpenChange,
  onEdit,
  onAddSubcategory,
  onEditSubcategory,
}: CategoryDetailSheetProps) {
  const deleteCategory = useDeleteCategory();
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  if (!category) return null;

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCategory.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
    // If deleting the main category, close the sheet
    if (deleteConfirm.id === category.id) {
      onOpenChange(false);
    }
  };

  const children = 'children' in category ? category.children : [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0">
          {/* Header */}
          <SheetHeader className="px-4 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{category.icon}</span>
                <SheetTitle className="text-xl">{category.name}</SheetTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(category)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteConfirm(category)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Subcategories section */}
            <div className="py-4">
              <div className="px-4 mb-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Subcategories
                </h3>
              </div>

              {children.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No subcategories yet
                  </p>
                </div>
              ) : (
                <div className="border-t border-border">
                  {children.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 px-4 min-h-[52px] border-b border-border last:border-b-0 bg-card"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xl">{sub.icon}</span>
                      <span className="flex-1 font-medium truncate">{sub.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditSubcategory(sub)}
                          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
                          aria-label="Edit subcategory"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sub)}
                          className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                          aria-label="Delete subcategory"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Subcategory Button - Fixed at bottom */}
          <div className="p-4 border-t border-border bg-background safe-area-bottom">
            <Button 
              onClick={() => onAddSubcategory(category.id, category.type as 'expense' | 'income')}
              className="w-full h-12"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Subcategory
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"?
              {deleteConfirm?.id === category.id && children.length > 0 
                ? ' This will also delete all subcategories.'
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
