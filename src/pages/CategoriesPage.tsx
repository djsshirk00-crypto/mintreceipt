import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCategories, useCategoriesWithHierarchy, useDeleteCategory, Category, CategoryWithChildren } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { CategoryListItem } from '@/components/categories/CategoryListItem';
import { CategoryDetailSheet } from '@/components/categories/CategoryDetailSheet';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function CategoriesPage() {
  const isMobile = useIsMobile();
  const { data: hierarchyData, isLoading } = useCategoriesWithHierarchy();
  const { data: allCategories } = useCategories();
  const deleteCategory = useDeleteCategory();

  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithChildren | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  
  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formInitialData, setFormInitialData] = useState<{
    name?: string;
    icon?: string;
    parent_id?: string;
    type?: 'expense' | 'income';
  }>({});

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  const topLevelCategories = allCategories?.filter(c => !c.parent_id) || [];
  const expenseCategories = hierarchyData?.filter(c => c.type === 'expense') || [];
  const incomeCategories = hierarchyData?.filter(c => c.type === 'income') || [];

  const handleOpenCreate = (parentId?: string, type: 'expense' | 'income' = 'expense') => {
    setEditingCategory(null);
    const defaultIcon = type === 'income' ? '💰' : '📦';
    setFormInitialData({ name: '', icon: defaultIcon, parent_id: parentId || '', type });
    setShowFormDialog(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormInitialData({});
    setShowFormDialog(true);
  };

  const handleCategoryTap = (category: CategoryWithChildren) => {
    if (isManageMode) return;
    setSelectedCategory(category);
    setShowDetailSheet(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCategory.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const renderCategoryList = (categories: CategoryWithChildren[], type: 'expense' | 'income') => (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {categories.map((category) => (
        <CategoryListItem
          key={category.id}
          category={category}
          isManageMode={isManageMode}
          subcategoryCount={category.children.length}
          onTap={() => handleCategoryTap(category)}
          onEdit={() => handleOpenEdit(category)}
          onDelete={() => setDeleteConfirm(category)}
        />
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 pb-safe">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Categories</h1>
              {!isMobile && (
                <p className="text-muted-foreground mt-1">
                  Manage your income and expense categories.
                </p>
              )}
            </div>
            
            {/* Manage Mode Toggle */}
            <Button
              variant={isManageMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsManageMode(!isManageMode)}
              className={cn(
                "gap-2 h-10",
                isManageMode && "bg-primary"
              )}
            >
              <Settings2 className="h-4 w-4" />
              {isManageMode ? 'Done' : 'Manage'}
              {isManageMode && (
                <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5">
                  ON
                </Badge>
              )}
            </Button>
          </div>

          {/* Mobile Action Buttons - Full width stacked */}
          {isMobile && (
            <div className="flex flex-col gap-3 px-0">
              <Button 
                onClick={() => handleOpenCreate(undefined, 'expense')}
                className="w-full h-12 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Expense Category
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOpenCreate(undefined, 'income')}
                className="w-full h-12 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Income Category
              </Button>
            </div>
          )}

          {/* Desktop Action Buttons */}
          {!isMobile && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenCreate(undefined, 'income')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
              <Button onClick={() => handleOpenCreate(undefined, 'expense')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          )}
        </div>

        {/* Manage Mode Indicator */}
        {isManageMode && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Manage Mode:</strong> Tap edit or delete icons to modify categories. Tap "Done" when finished.
          </div>
        )}

        {/* Categories List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 px-1">
                  💰 Income Categories
                </h2>
                {renderCategoryList(incomeCategories, 'income')}
              </div>
            )}

            {/* Expense Categories */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 px-1">
                🏷️ Expense Categories
              </h2>
              {expenseCategories.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No expense categories yet. Add your first one!
                  </p>
                </div>
              ) : (
                renderCategoryList(expenseCategories, 'expense')
              )}
            </div>
          </div>
        )}

        {/* Category Detail Sheet (Mobile) */}
        <CategoryDetailSheet
          category={selectedCategory}
          open={showDetailSheet}
          onOpenChange={setShowDetailSheet}
          onEdit={(cat) => {
            setShowDetailSheet(false);
            handleOpenEdit(cat);
          }}
          onAddSubcategory={(parentId, type) => {
            setShowDetailSheet(false);
            handleOpenCreate(parentId, type);
          }}
          onEditSubcategory={(sub) => {
            setShowDetailSheet(false);
            handleOpenEdit(sub);
          }}
        />

        {/* Create/Edit Dialog */}
        <CategoryFormDialog
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          editingCategory={editingCategory}
          initialData={formInitialData}
          topLevelCategories={topLevelCategories}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Category</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteConfirm?.name}"? 
                {deleteConfirm && hierarchyData?.find(c => c.id === deleteConfirm.id)?.children.length 
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
      </div>
    </AppLayout>
  );
}
