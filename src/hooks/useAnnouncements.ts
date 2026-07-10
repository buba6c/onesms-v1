import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'promotional' | 'maintenance' | 'update' | 'gift' | 'alert' | 'news';
  is_active: boolean;
  show_as_popup: boolean;
  show_in_header: boolean;
  target_type: 'all' | 'specific_users' | 'positive_balance' | 'negative_balance';
  target_users: string[]; // List of emails
  design_template: 'default' | 'modern' | 'glassmorphism' | 'neon' | 'elegant';
  color_theme?: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export function useAnnouncements() {
  const { user } = useAuthStore();

  return useQuery<SystemAnnouncement[]>({
    queryKey: ['system-announcements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }
      
      const allAnnouncements = (data as SystemAnnouncement[]) || [];
      
      return allAnnouncements.filter((ann) => {
        const now = new Date();
        if (ann.start_date && new Date(ann.start_date) > now) return false;
        if (ann.end_date && new Date(ann.end_date) < now) return false;

        if (ann.target_type === 'all' || !ann.target_type) return true;
        
        if (!user) return false;
        
        if (ann.target_type === 'positive_balance') {
          return (user.balance || 0) > 0;
        }
        
        if (ann.target_type === 'negative_balance') {
          return (user.balance || 0) <= 0;
        }
        
        if (ann.target_type === 'specific_users') {
          if (!ann.target_users || !Array.isArray(ann.target_users)) return false;
          return ann.target_users.includes(user.email || '');
        }
        
        return true;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 mins
  });
}
