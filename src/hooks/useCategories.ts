import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

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

// Clone system categories to user account on first use
async function ensureUserCategories(userId: string): Promise<boolean> {
  // Check if user has any personal categories
  const { data: userCategories, error: checkError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError) throw checkError;

  // If user already has categories, no need to clone
  if (userCategories && userCategories.length > 0) {
    return false;
  }

  // Get all system categories
  const { data: systemCategories, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .eq('is_system', true)
    .order('sort_order', { ascending: true });

  if (fetchError) throw fetchError;
  if (!systemCategories || systemCategories.length === 0) return false;

  // Create a mapping from old IDs to new IDs for parent relationships
  const idMapping: Record<string, string> = {};

  // First pass: clone top-level categories (no parent_id)
  const topLevel = systemCategories.filter(c => !c.parent_id);
  for (const cat of topLevel) {
    const { data: newCat, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        parent_id: null,
        is_system: false,
        sort_order: cat.sort_order,
        type: cat.type,
      })
      .select()
      .single();

    if (error) throw error;
    if (newCat) {
      idMapping[cat.id] = newCat.id;
    }
  }

  // Second pass: clone subcategories with updated parent_id
  const children = systemCategories.filter(c => c.parent_id);
  for (const cat of children) {
    const newParentId = idMapping[cat.parent_id!];
    if (!newParentId) continue; // Skip if parent wasn't cloned

    const { data: newCat, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        parent_id: newParentId,
        is_system: false,
        sort_order: cat.sort_order,
        type: cat.type,
      })
      .select()
      .single();

    if (error) throw error;
    if (newCat) {
      idMapping[cat.id] = newCat.id;
    }
  }

  return true;
}

// Hook to ensure categories are initialized for the user
export function useInitializeCategories() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setIsInitializing(false);
          setIsInitialized(true);
          return;
        }
        
        const cloned = await ensureUserCategories(user.id);
        if (cloned && !cancelled) {
          // Invalidate queries to refetch with new user categories
          await queryClient.invalidateQueries({ queryKey: ['categories'] });
          await queryClient.invalidateQueries({ queryKey: ['categories-hierarchy'] });
          await queryClient.invalidateQueries({ queryKey: ['categories-expense'] });
          await queryClient.invalidateQueries({ queryKey: ['categories-income'] });
        }
      } catch (error) {
        console.error('Failed to initialize categories:', error);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
          setIsInitialized(true);
        }
      }
    };

    init();
    
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return { isInitializing, isInitialized };
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch user's personal categories (not system ones)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user?.id)
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

      // Get max sort order for user's categories
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('user_id', user.id)
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
