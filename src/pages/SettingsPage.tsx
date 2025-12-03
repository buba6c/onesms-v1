import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface UserData {
  email: string;
  id: string;
  balance: number;
  frozenBalance: number;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuthStore();
  
  const [userData, setUserData] = useState<UserData>({
    email: user?.email || '',
    id: user?.id || '',
    balance: 0,
    frozenBalance: 0,
  });

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, id, balance, frozen_balance')
        .eq('id', user.id)
        .single() as { data: { email: string; id: string; balance: number; frozen_balance: number } | null; error: any };

      if (error) throw error;

      if (data) {
        setUserData({
          email: data.email,
          id: data.id,
          balance: data.balance || 0,
          frozenBalance: data.frozen_balance || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDelete = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      try {
        await supabase.from('users').delete().eq('id', user?.id);
        await signOut();
        navigate('/');
        toast({
          title: 'Compte supprimé',
          description: 'Votre compte a été supprimé avec succès'
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer le compte',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-center mb-8">My account</h1>
            
            <div className="space-y-6">
              {/* Your email */}
              <div>
                <label className="text-sm text-gray-500 block mb-2">Your email</label>
                <p className="text-lg font-medium">{userData.email}</p>
              </div>

              {/* Your ID */}
              <div>
                <label className="text-sm text-gray-500 block mb-2">Your ID</label>
                <p className="text-lg font-medium">{userData.id}</p>
              </div>

              {/* Balance display */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="space-y-4">
                  {/* Solde disponible (balance - frozen) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      <span className="text-gray-700 font-medium">{t('dashboard.balance')}</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{Math.floor(userData.balance - userData.frozenBalance)} Ⓐ</p>
                  </div>
                  
                  {/* Frozen - seulement si > 0 */}
                  {userData.frozenBalance > 0 && (
                    <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔒</span>
                        <span className="text-gray-700 font-medium">{t('dashboard.frozen')}</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-500">{Math.floor(userData.frozenBalance)} Ⓐ</p>
                    </div>
                  )}
                  
                  {/* Total - seulement si frozen > 0 */}
                  {userData.frozenBalance > 0 && (
                    <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <span className="text-gray-500 font-medium">Total</span>
                      </div>
                      <p className="text-xl font-medium text-gray-500">{Math.floor(userData.balance)} Ⓐ</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>

              {/* Delete Button */}
              <Button
                onClick={handleDelete}
                variant="outline"
                className="w-full border-2 border-red-500 text-red-500 hover:bg-red-50 h-12 text-lg font-medium"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
