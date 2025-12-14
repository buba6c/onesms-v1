import { supabase } from '../supabase';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  replied_at?: string;
  replied_by?: string;
}

export interface SubmitContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactMessagesApi = {
  // Submit a contact form (public)
  async submitContactForm(data: SubmitContactFormData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: result, error } = await supabase
        .from('contact_messages')
        .insert({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          subject: data.subject.trim(),
          message: data.message.trim(),
          status: 'new',
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error submitting contact form:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: result?.id };
    } catch (err) {
      console.error('Error submitting contact form:', err);
      return { success: false, error: 'Une erreur est survenue. Veuillez réessayer.' };
    }
  },

  // Get all messages (admin only)
  async getAllMessages(status?: string): Promise<ContactMessage[]> {
    try {
      let query = supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching contact messages:', error);
        return [];
      }

      return data as ContactMessage[];
    } catch (err) {
      console.error('Error fetching contact messages:', err);
      return [];
    }
  },

  // Get message by ID (admin only)
  async getMessageById(id: string): Promise<ContactMessage | null> {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching contact message:', error);
        return null;
      }

      return data as ContactMessage;
    } catch (err) {
      console.error('Error fetching contact message:', err);
      return null;
    }
  },

  // Update message status (admin only)
  async updateMessageStatus(id: string, status: ContactMessage['status']): Promise<boolean> {
    try {
      const updateData: Partial<ContactMessage> = { status };
      
      if (status === 'replied') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.replied_at = new Date().toISOString();
          updateData.replied_by = user.id;
        }
      }

      const { error } = await supabase
        .from('contact_messages')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating message status:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error updating message status:', err);
      return false;
    }
  },

  // Delete message (admin only)
  async deleteMessage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  },

  // Get unread count (admin only)
  async getUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      return 0;
    }
  },
};
