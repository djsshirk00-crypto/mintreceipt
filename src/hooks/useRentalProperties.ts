import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns';

export interface RentalProperty {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  mortgage_amount: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewRentalProperty {
  name: string;
  address?: string | null;
  mortgage_amount?: number;
  notes?: string | null;
}

// ── Fetch all rental properties ────────────────────────────────────────────
export function useRentalProperties() {
  return useQuery({
    queryKey: ['rental-properties'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('rental_properties')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as RentalProperty[];
    },
  });
}

// ── Rental property P&L summary ────────────────────────────────────────────
export function useRentalPropertySummary(propertyId: string, year?: number) {
  const targetYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['rental-summary', propertyId, targetYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = format(startOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');

      // Income for this property
      const { data: incomeData } = await supabase
        .from('income_transactions')
        .select('amount, transaction_date')
        .eq('user_id', user.id)
        .eq('rental_property_id', propertyId)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      const totalIncome = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Get property mortgage
      const { data: property } = await supabase
        .from('rental_properties')
        .select('mortgage_amount, name')
        .eq('id', propertyId)
        .single();

      const monthlyMortgage = property?.mortgage_amount || 0;
      const totalMortgage = monthlyMortgage * 12;
      const netIncome = totalIncome - totalMortgage;

      // Monthly breakdown
      const monthly: Record<string, { income: number; mortgage: number; net: number }> = {};
      for (let m = 0; m < 12; m++) {
        const monthKey = format(new Date(targetYear, m), 'yyyy-MM');
        const monthLabel = format(new Date(targetYear, m), 'MMM');
        const monthIncome = (incomeData || [])
          .filter(t => t.transaction_date.startsWith(monthKey))
          .reduce((sum, t) => sum + Number(t.amount), 0);
        monthly[monthLabel] = {
          income: monthIncome,
          mortgage: monthlyMortgage,
          net: monthIncome - monthlyMortgage,
        };
      }

      return {
        propertyName: property?.name || '',
        totalIncome,
        totalMortgage,
        netIncome,
        monthly,
      };
    },
    enabled: !!propertyId,
  });
}

// ── All properties annual summary ──────────────────────────────────────────
export function useAllRentalSummary(year?: number) {
  const targetYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['all-rental-summary', targetYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const start = format(startOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');
      const end = format(endOfYear(new Date(targetYear, 0)), 'yyyy-MM-dd');

      const { data: properties } = await supabase
        .from('rental_properties')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: incomeData } = await supabase
        .from('income_transactions')
        .select('amount, rental_property_id')
        .eq('user_id', user.id)
        .eq('income_type', 'rental')
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      const summaries = (properties || []).map(p => {
        const income = (incomeData || [])
          .filter(t => t.rental_property_id === p.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const mortgage = (p.mortgage_amount || 0) * 12;
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          income,
          mortgage,
          net: income - mortgage,
          monthlyMortgage: p.mortgage_amount || 0,
        };
      });

      const totalIncome = summaries.reduce((s, p) => s + p.income, 0);
      const totalMortgage = summaries.reduce((s, p) => s + p.mortgage, 0);
      const totalNet = totalIncome - totalMortgage;

      return { summaries, totalIncome, totalMortgage, totalNet };
    },
  });
}

// ── Add rental property ────────────────────────────────────────────────────
export function useAddRentalProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: NewRentalProperty) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('rental_properties')
        .insert({ ...property, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-summary'] });
      toast.success('Property added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add property: ${error.message}`);
    },
  });
}

// ── Update rental property ─────────────────────────────────────────────────
export function useUpdateRentalProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RentalProperty> & { id: string }) => {
      const { data, error } = await supabase
        .from('rental_properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rental-summary'] });
      toast.success('Property updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update property: ${error.message}`);
    },
  });
}

// ── Delete rental property ─────────────────────────────────────────────────
export function useDeleteRentalProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rental_properties')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-summary'] });
      toast.success('Property removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove property: ${error.message}`);
    },
  });
}
