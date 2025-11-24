import { supabase } from '@/lib/supabase';

export interface ActivationPackage {
  id: string;
  activations: number;
  price_xof: number;
  price_eur: number;
  price_usd: number;
  is_popular: boolean;
  savings_percentage: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const packagesApi = {
  // Get all active packages
  async getActivePackages(): Promise<ActivationPackage[]> {
    const { data, error } = await supabase
      .from('activation_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all packages (admin only)
  async getAllPackages(): Promise<ActivationPackage[]> {
    const { data, error } = await supabase
      .from('activation_packages')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create package (admin only)
  async createPackage(packageData: Omit<ActivationPackage, 'id' | 'created_at' | 'updated_at'>): Promise<ActivationPackage> {
    const { data, error } = await supabase
      .from('activation_packages')
      .insert([packageData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update package (admin only)
  async updatePackage(id: string, packageData: Partial<ActivationPackage>): Promise<ActivationPackage> {
    const { data, error } = await supabase
      .from('activation_packages')
      .update(packageData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete package (admin only)
  async deletePackage(id: string): Promise<void> {
    const { error } = await supabase
      .from('activation_packages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle package active status (admin only)
  async togglePackageStatus(id: string, isActive: boolean): Promise<ActivationPackage> {
    const { data, error } = await supabase
      .from('activation_packages')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
