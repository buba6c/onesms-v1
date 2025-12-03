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
      .insert([packageData] as any)
      .select()
      .single();

    if (error) throw error;
    return data as ActivationPackage;
  },

  // Update package (admin only)
  async updatePackage(id: string, packageData: Partial<ActivationPackage>): Promise<ActivationPackage> {
    const { data, error } = await (supabase
      .from('activation_packages') as any)
      .update(packageData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ActivationPackage;
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
    const { data, error } = await (supabase
      .from('activation_packages') as any)
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ActivationPackage;
  },

  // Set a package as the most popular (removes popular status from others)
  async setAsPopular(id: string): Promise<void> {
    // First, remove is_popular from all packages that are currently popular
    const { error: resetError } = await (supabase
      .from('activation_packages') as any)
      .update({ is_popular: false })
      .eq('is_popular', true); // Only update those that are currently popular

    if (resetError) throw resetError;

    // Then set the selected package as popular
    const { error: setError } = await (supabase
      .from('activation_packages') as any)
      .update({ is_popular: true })
      .eq('id', id);

    if (setError) throw setError;
  },
};
