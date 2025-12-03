import { supabase } from '../supabase';

export interface ContactSettings {
  id: string;
  email: string;
  whatsapp: string;
  address: string;
  address_detail: string;
  hours_weekday: string;
  hours_saturday: string;
  hours_sunday: string;
  email_response_time: string;
  whatsapp_hours: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<ContactSettings, 'id' | 'created_at' | 'updated_at'> = {
  email: 'support@onesms-sn.com',
  whatsapp: '+221 77 123 45 67',
  address: 'Dakar, Sénégal',
  address_detail: "Afrique de l'Ouest",
  hours_weekday: 'Lundi - Vendredi: 9h - 18h',
  hours_saturday: 'Samedi: 9h - 14h',
  hours_sunday: 'Dimanche: Fermé',
  email_response_time: 'Réponse sous 24h',
  whatsapp_hours: 'Lun-Sam, 9h-18h',
};

export const contactSettingsApi = {
  // Get contact settings (public)
  async getSettings(): Promise<ContactSettings> {
    try {
      // Use rpc or direct fetch to avoid type issues with new tables
      const { data, error } = await supabase
        .rpc('get_contact_settings')
        .single();

      if (error || !data) {
        // Fallback: try direct query
        const { data: directData, error: directError } = await supabase
          .from('contact_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (directError || !directData) {
          console.warn('Contact settings not found, using defaults');
          return {
            id: 'default',
            ...DEFAULT_SETTINGS,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return directData as ContactSettings;
      }

      return data as ContactSettings;
    } catch (err) {
      console.error('Error fetching contact settings:', err);
      return {
        id: 'default',
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  // Update contact settings (admin only)
  async updateSettings(settings: Partial<ContactSettings>): Promise<ContactSettings> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _created, updated_at: _updated, ...updateData } = settings as ContactSettings;

    try {
      // First try to get existing settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('contact_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing && existing.id) {
        // Update existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('contact_settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as ContactSettings;
      } else {
        // Insert new
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('contact_settings')
          .insert([updateData])
          .select()
          .single();

        if (error) throw error;
        return data as ContactSettings;
      }
    } catch (err) {
      console.error('Error updating contact settings:', err);
      throw err;
    }
  },
};
