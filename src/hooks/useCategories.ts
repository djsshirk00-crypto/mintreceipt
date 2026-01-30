import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  is_system: boolean;
  sort_order: number;
  type: 'expense' | 'income';
  created_at: string;
  updated_at: string;
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCategoriesWithHierarchy() {
  return useQuery({
    queryKey: ['categories-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const categories = data as Category[];
      
      // Build hierarchy: top-level categories with children
      const topLevel = categories.filter(c => !c.parent_id);
      const result: CategoryWithChildren[] = topLevel.map(parent => ({
        ...parent,
        children: categories.filter(c => c.parent_id === parent.id),
      }));

      return result;
    },
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['categories-expense'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useIncomeCategories() {
  return useQuery({
    queryKey: ['categories-income'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'income')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: {
      name: string;
      icon?: string;
      color?: string;
      parent_id?: string | null;
      type?: 'expense' | 'income';
    }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('You must be logged in');

      // Get max sort order
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existingCategories?.[0]?.sort_order || 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          icon: category.icon || '📦',
          color: category.color || 'muted',
          parent_id: category.parent_id || null,
          is_system: false,
          sort_order: maxOrder + 1,
          type: category.type || 'expense',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['categories-expense'] });
      queryClient.invalidateQueries({ queryKey: ['categories-income'] });
      toast.success('Category created');
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'parent_id' | 'sort_order' | 'type'>> 
    }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['categories-expense'] });
      queryClient.invalidateQueries({ queryKey: ['categories-income'] });
      toast.success('Category updated');
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['categories-expense'] });
      queryClient.invalidateQueries({ queryKey: ['categories-income'] });
      toast.success('Category deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}
