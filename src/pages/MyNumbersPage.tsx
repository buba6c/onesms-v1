import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react';
import { formatDate, formatCurrency, calculateTimeRemaining } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { toast } from '@/hooks/use-toast';

interface VirtualNumber {
  id: string;
  provider_id: string;
  phone_number: string;
  country: string;
  operator: string;
  service: string;
  status: string;
  purchase_type: string;
  cost: number;
  created_at: string;
  expires_at: string;
  sms?: Array<{
    id: string;
    sender: string;
    text: string;
    code: string | null;
    created_at: string;
  }>;
}

export default function MyNumbersPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 🔴 REALTIME: Écoute les changements sur virtual_numbers en temps réel
  useRealtimeSubscription({
    table: 'virtual_numbers',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    queryKeys: [['virtual-numbers', user?.id]],
    onUpdate: (payload) => {
      const newData = payload.new as any;
      if (newData?.sms && newData.sms.length > 0) {
        toast({
          title: '📱 Nouveau SMS !',
          description: `Message reçu sur ${newData.phone_number}`,
          duration: 5000,
        });
      }
    }
  });

  // Fetch user's virtual numbers
  const { data: numbers, isLoading } = useQuery<VirtualNumber[]>({
    queryKey: ['virtual-numbers', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('virtual_numbers')
        .select(`
          *,
          sms:sms_received(
            id,
            sender,
            text,
            code,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VirtualNumber[];
    },
    enabled: !!user?.id,
    // Polling désactivé - realtime activé
    refetchInterval: false,
  });

  // Cancel/Delete number mutation
  const deleteMutation = useMutation({
    mutationFn: async (numberId: string) => {
      const number = numbers?.find(n => n.id === numberId);
      if (!number) throw new Error('Number not found');

      // Cancel via SMS-Activate Edge Function if still active
      if (number.status === 'active' || number.status === 'pending') {
        try {
          await supabase.functions.invoke('cancel-sms-activate-order', {
            body: { activationId: number.id, userId: user?.id }
          });
        } catch (error) {
          console.error('Error canceling activation:', error);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('virtual_numbers')
        .delete()
        .eq('id', numberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-numbers'] });
      toast({
        title: t('toasts.deleted'),
        description: t('toasts.deletedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: t('status.active'), variant: 'default' },
      pending: { label: t('status.pending'), variant: 'secondary' },
      completed: { label: t('status.completed'), variant: 'outline' },
      expired: { label: t('status.expired'), variant: 'destructive' },
      cancelled: { label: t('status.cancelled'), variant: 'destructive' },
    };
    return config[status] || { label: status, variant: 'outline' };
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: t('toasts.copied'),
      description: t('toasts.copiedNumber'),
    });
  };

  const activeNumbers = numbers?.filter(n => n.status === 'active' || n.status === 'pending') || [];
  const completedNumbers = numbers?.filter(n => n.status === 'completed') || [];
  const expiredNumbers = numbers?.filter(n => n.status === 'expired' || n.status === 'cancelled') || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-10 lg:pt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-10 lg:pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mes Numéros</h1>
          <p className="text-gray-600">Gérez vos numéros virtuels et consultez vos SMS</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['virtual-numbers'] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeNumbers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Complétés</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedNumbers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expirés</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredNumbers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Numbers */}
      {activeNumbers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Numéros Actifs</h2>
          <div className="space-y-4">
            {activeNumbers.map(number => (
              <Card key={number.id} className="border-l-4 border-l-green-600">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl font-mono">{formatPhoneNumber(number.phone_number)}</CardTitle>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(number.phone_number, number.id)}
                        >
                          {copiedId === number.id ? 
                            <CheckCircle className="h-4 w-4 text-green-600" /> : 
                            <Copy className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                      <CardDescription className="flex flex-wrap gap-2">
                        <span className="capitalize">{number.country}</span>
                        <span>•</span>
                        <span className="capitalize">{number.service}</span>
                        <span>•</span>
                        <span>{formatDate(number.created_at)}</span>
                      </CardDescription>
                    </div>
                    <Badge {...getStatusBadge(number.status)}>
                      {getStatusBadge(number.status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* SMS Display */}
                  {number.sms && number.sms.length > 0 ? (
                    <div className="space-y-2">
                      {number.sms.map(sms => (
                        <div key={sms.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-green-800">De: {sms.sender}</span>
                            <span className="text-xs text-green-600">{formatDate(sms.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{sms.text}</p>
                          {sms.code && (
                            <div className="bg-white rounded px-3 py-2 inline-block">
                              <span className="text-xs text-green-600 font-medium">Code: </span>
                              <span className="text-lg font-mono font-bold text-green-800">{sms.code}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-pulse" />
                      <p className="text-sm text-blue-800">En attente du SMS...</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(number.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Numbers */}
      {completedNumbers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Numéros Complétés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedNumbers.map(number => (
              <Card key={number.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-mono">{formatPhoneNumber(number.phone_number)}</CardTitle>
                      <CardDescription className="capitalize">
                        {number.country} - {number.service}
                      </CardDescription>
                    </div>
                    <Badge {...getStatusBadge(number.status)}>
                      {getStatusBadge(number.status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">
                    {number.sms?.length || 0} SMS reçu(s)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedNumber(selectedNumber === number.id ? null : number.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {selectedNumber === number.id ? 'Masquer' : 'Voir les SMS'}
                  </Button>

                  {selectedNumber === number.id && number.sms && (
                    <div className="mt-4 space-y-2">
                      {number.sms.map(sms => (
                        <div key={sms.id} className="bg-gray-50 rounded p-3">
                          <p className="text-xs text-gray-600 mb-1">{sms.sender} - {formatDate(sms.created_at)}</p>
                          <p className="text-sm">{sms.text}</p>
                          {sms.code && (
                            <p className="text-sm font-mono font-bold text-blue-600 mt-1">Code: {sms.code}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {numbers?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">Aucun numéro</h3>
            <p className="text-gray-600 mb-4">Vous n'avez pas encore acheté de numéro virtuel</p>
            <Button onClick={() => window.location.href = '/catalog'}>
              Acheter un numéro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
