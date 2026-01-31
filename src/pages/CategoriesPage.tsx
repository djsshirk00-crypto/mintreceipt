import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCategories, useCategoriesWithHierarchy, useCreateCategory, useUpdateCategory, useDeleteCategory, useInitializeCategories, Category } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const EMOJI_OPTIONS = ['📦', '🍕', '🏠', '👕', '🎬', '💊', '🚗', '🎮', '📱', '💼', '🎁', '✈️', '🏋️', '📚', '🐕', '🌿', '🔧', '💡', '💰', '📥'];
const INCOME_EMOJI_OPTIONS = ['💰', '💵', '💼', '📥', '🏦', '📈', '💸', '🎯'];

export default function CategoriesPage() {
  const { isInitializing, isInitialized } = useInitializeCategories();
  const { data: hierarchyData, isLoading } = useCategoriesWithHierarchy();
  const { data: allCategories } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '📦', parent_id: '', type: 'expense' as 'expense' | 'income' });
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  const topLevelCategories = allCategories?.filter(c => !c.parent_id) || [];
  const expenseCategories = hierarchyData?.filter(c => c.type === 'expense') || [];
  const incomeCategories = hierarchyData?.filter(c => c.type === 'income') || [];

  const handleOpenCreate = (parentId?: string, type: 'expense' | 'income' = 'expense') => {
    setEditingCategory(null);
    const defaultIcon = type === 'income' ? '💰' : '📦';
    setFormData({ name: '', icon: defaultIcon, parent_id: parentId || '', type });
    setShowDialog(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      icon: category.icon, 
      parent_id: category.parent_id || '',
      type: category.type,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        updates: {
          name: formData.name.trim(),
          icon: formData.icon,
          parent_id: formData.parent_id || null,
        },
      });
    } else {
      await createCategory.mutateAsync({
        name: formData.name.trim(),
        icon: formData.icon,
        parent_id: formData.parent_id || null,
        type: formData.type,
      });
    }

    setShowDialog(false);
    setFormData({ name: '', icon: '📦', parent_id: '', type: 'expense' });
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCategory.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Show loading state while initializing categories
  if (isInitializing || !isInitialized) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Categories</h1>
              <p className="text-muted-foreground mt-1">
                Setting up your categories...
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground mt-1">
              Manage your income and expense categories.
            </p>
          </div>
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
        </div>

        {/* Categories List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  💰 Income Categories
                </h2>
                {incomeCategories.map(category => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <span className="font-semibold">{category.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Expense Categories */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                🏷️ Expense Categories
              </h2>
              {expenseCategories.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      No expense categories yet. Add your first one!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                expenseCategories.map(category => (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <span className="font-semibold">{category.name}</span>
                            {category.children.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {category.children.length} subcategories
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCreate(category.id, 'expense')}
                          >
                            <Plus className="h-4 w-4" />
                            Subcategory
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {category.children.length > 0 && (
                        <div className="mt-4 ml-8 space-y-2">
                          {category.children.map(sub => (
                            <div 
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg">{sub.icon}</span>
                                <span>{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenEdit(sub)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeleteConfirm(sub)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Restaurants"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {(formData.type === 'income' ? INCOME_EMOJI_OPTIONS : EMOJI_OPTIONS).map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                      className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                        formData.icon === emoji 
                          ? 'border-primary bg-primary/10' 
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {!editingCategory?.parent_id && (
                <div className="space-y-2">
                  <Label>Parent Category (optional)</Label>
                  <Select
                    value={formData.parent_id || '__none__'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      parent_id: value === '__none__' ? '' : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (top-level)</SelectItem>
                      {topLevelCategories
                        .filter(c => c.id !== editingCategory?.id)
                        .map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name.trim() || createCategory.isPending || updateCategory.isPending}
              >
                {editingCategory ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            <DialogFooter>
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
