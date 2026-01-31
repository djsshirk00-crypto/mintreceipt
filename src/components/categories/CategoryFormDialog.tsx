import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';

const EMOJI_OPTIONS = ['📦', '🍕', '🏠', '👕', '🎬', '💊', '🚗', '🎮', '📱', '💼', '🎁', '✈️', '🏋️', '📚', '🐕', '🌿', '🔧', '💡', '💰', '📥'];
const INCOME_EMOJI_OPTIONS = ['💰', '💵', '💼', '📥', '🏦', '📈', '💸', '🎯'];

interface FormData {
  name: string;
  icon: string;
  parent_id: string;
  type: 'expense' | 'income';
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  initialData?: Partial<FormData>;
  topLevelCategories: Category[];
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  editingCategory,
  initialData,
  topLevelCategories,
}: CategoryFormDialogProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    icon: '📦',
    parent_id: '',
    type: 'expense',
  });

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        icon: editingCategory.icon,
        parent_id: editingCategory.parent_id || '',
        type: editingCategory.type as 'expense' | 'income',
      });
    } else if (initialData) {
      setFormData({
        name: initialData.name || '',
        icon: initialData.icon || (initialData.type === 'income' ? '💰' : '📦'),
        parent_id: initialData.parent_id || '',
        type: initialData.type || 'expense',
      });
    }
  }, [editingCategory, initialData, open]);

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

    onOpenChange(false);
    setFormData({ name: '', icon: '📦', parent_id: '', type: 'expense' });
  };

  const emojiOptions = formData.type === 'income' ? INCOME_EMOJI_OPTIONS : EMOJI_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                  className={`text-2xl p-2 rounded-lg border-2 transition-colors min-w-[48px] min-h-[48px] ${
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

          {!editingCategory?.parent_id && !initialData?.parent_id && (
            <div className="space-y-2">
              <Label>Parent Category (optional)</Label>
              <Select
                value={formData.parent_id || '__none__'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value === '__none__' ? '' : value 
                }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {topLevelCategories
                    .filter(c => c.id !== editingCategory?.id && c.type === formData.type)
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim() || createCategory.isPending || updateCategory.isPending}
            className="h-11"
          >
            {editingCategory ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
