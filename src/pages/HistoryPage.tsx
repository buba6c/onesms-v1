import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { 
  Copy,
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getServiceLogo, getServiceLogoFallback, getServiceIcon, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';

// Gestionnaire d'erreur pour les images - utilise fallback SVG
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, serviceCode?: string) => {
  const target = e.target as HTMLImageElement
  
  // Empêcher les multiples déclenchements et boucles infinies
  if (target.dataset.fallbackLoaded === 'true') {
    // Si le fallback échoue aussi, afficher l'emoji
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
    return
  }
  
  // Si on a un serviceCode, charger le fallback SVG
  if (serviceCode) {
    target.dataset.fallbackLoaded = 'true'
    target.src = getServiceLogoFallback(serviceCode)
  } else {
    // Sinon, afficher l'emoji directement
    target.style.display = 'none'
    const emoji = target.nextElementSibling as HTMLSpanElement
    if (emoji) {
      emoji.style.display = 'flex'
    }
  }
}

interface Order {
  id: string;
  order_id: string;
  phone: string;
  service_code: string;
  country_code: string;
  operator: string;
  price: number;
  status: 'pending' | 'waiting' | 'received' | 'timeout' | 'cancelled';
  sms_code?: string;
  sms_text?: string;
  created_at: string;
  expires_at: string;
  charged: boolean;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  metadata?: any;
}

type Tab = 'orders' | 'payments';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [ordersPage, setOrdersPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch orders history
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['orders-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('activations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [HISTORY] Erreur chargement orders:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch payments history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['payments-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [HISTORY] Erreur chargement payments:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied'),
      description: t('common.success')
    });
  };

  const cancelActivation = async (activationId: string, orderId: string) => {
    try {
      console.log('🚫 [CANCEL] Starting cancellation for:', { activationId, orderId });

      // 1. Cancel via Edge Function (plus sécurisé)
      const { data, error } = await supabase.functions.invoke('cancel-sms-activate-order', {
        body: { orderId: parseInt(orderId) }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || '5sim cancellation failed');
      }

      console.log('✅ [CANCEL] 5sim cancellation successful');

      // 2. Update Supabase status
      const { error: updateError } = await supabase
        .from('activations')
        .update({ 
          status: 'cancelled' as const,
          charged: false
        } as any)
        .eq('id', activationId);

      if (updateError) {
        console.error('❌ [CANCEL] Supabase update error:', updateError);
        throw updateError;
      }

      console.log('✅ [CANCEL] Database updated to cancelled');

      // 3. Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      await queryClient.invalidateQueries({ queryKey: ['active-numbers'] });

      toast({
        title: 'Activation annulée',
        description: 'Le numéro a été annulé avec succès',
      });

    } catch (error: any) {
      console.error('❌ [CANCEL] Error:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'annuler l\'activation',
        variant: 'destructive'
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (expiresAt: string): number => {
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expires - now) / 1000));
  };

  const getOrderStatus = (order: Order): 'waiting' | 'received' | 'timeout' | 'cancelled' => {
    // Si le statut est déjà défini comme received, timeout ou cancelled, le retourner
    if (order.status === 'received' || order.status === 'timeout' || order.status === 'cancelled') {
      return order.status;
    }
    // Si le temps est écoulé et qu'on attend toujours, c'est un timeout
    const timeRemaining = getTimeRemaining(order.expires_at);
    if (timeRemaining === 0 && (order.status === 'waiting' || order.status === 'pending')) {
      return 'timeout';
    }
    return 'waiting';
  };

  const getServiceName = (code: string): string => {
    const serviceMap: Record<string, string> = {
      'instagram': 'Instagram',
      'whatsapp': 'Whatsapp',
      'google': 'Google,yout...',
      'facebook': 'Facebook',
      'telegram': 'Telegram',
      'twitter': 'Twitter',
      'tiktok': 'TikTok'
    };
    return serviceMap[code.toLowerCase()] || code;
  };

  const getCountryName = (code: string): string => {
    const countryMap: Record<string, string> = {
      'us': 'USA',
      'gb': 'UK',
      'hk': 'Hong Kong',
      'ma': 'Morocco',
      'ar': 'Argentina'
    };
    return countryMap[code.toLowerCase()] || code.toUpperCase();
  };

  // Pagination for orders
  const totalOrdersPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice(
    (ordersPage - 1) * itemsPerPage,
    ordersPage * itemsPerPage
  );

  // Pagination for payments
  const totalPaymentsPages = Math.ceil(payments.length / itemsPerPage);
  const paginatedPayments = payments.slice(
    (paymentsPage - 1) * itemsPerPage,
    paymentsPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-6">{t('history.title')}</h1>
          
          {/* Tabs */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('history.orders')}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t('history.payments')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'orders' ? (
          <>
            {/* Orders List */}
            {ordersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">{t('common.loading')}</p>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">📋</span>
                </div>
                <p className="text-gray-500 mb-2">{t('history.noOrders')}</p>
                <p className="text-sm text-gray-400">{t('history.noOrders')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedOrders.map((order) => {
                  const actualStatus = getOrderStatus(order);
                  const timeRemaining = getTimeRemaining(order.expires_at);
                  
                  return (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Logo + Flag (52px zone) */}
                      <div className="relative flex-shrink-0">
                        <div className="w-[52px] h-[52px] bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                          <img 
                            src={getServiceLogo(order.service_code)}
                            alt={order.service_code}
                            className="w-7 h-7 object-contain"
                            onError={(e) => handleImageError(e, order.service_code)}
                          />
                          <span className="text-lg hidden items-center justify-center">{getServiceIcon(order.service_code)}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-[3px] border-white overflow-hidden bg-white shadow-md">
                          <img 
                            src={getCountryFlag(order.country_code)}
                            alt={order.country_code}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e)}
                          />
                          <span className="text-xl hidden items-center justify-center">{getFlagEmoji(order.country_code)}</span>
                        </div>
                      </div>

                      {/* Service + Country (140px) */}
                      <div className="w-[140px] flex-shrink-0">
                        <p className="font-semibold text-[15px] text-gray-900 leading-tight truncate">
                          {getServiceName(order.service_code)} + ...
                        </p>
                        <p className="text-[13px] text-gray-500 leading-tight">{getCountryName(order.country_code)}</p>
                      </div>

                      {/* Phone number avec fond gris (240px pour le format complet) */}
                      <div className="flex items-center gap-2 w-[240px] flex-shrink-0">
                        <span className="font-mono text-[14px] font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded whitespace-nowrap">
                          {formatPhoneNumber(order.phone)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(order.phone)}
                          className="p-1 hover:bg-blue-50 rounded-md transition-colors"
                          title="Copier le numéro"
                        >
                          <Copy className="h-4 w-4 text-blue-500" />
                        </button>
                      </div>

                      {/* Flexible right section */}
                      <div className="flex items-center gap-4 flex-1 justify-end">
                        {/* Code bleu OU Waiting spinner */}
                        {actualStatus === 'received' && order.sms_code ? (
                          <div className="bg-[#007AFF] text-white rounded-2xl rounded-tr-md px-4 py-2.5 shadow-md max-w-md">
                            <span className="font-medium text-[14px] leading-relaxed">
                              {(() => {
                                // Extraire le code SMS si le format est STATUS_OK:code
                                const cleanCode = order.sms_code.includes('STATUS_OK:') 
                                  ? order.sms_code.split(':')[1] 
                                  : order.sms_code;
                                
                                return order.sms_text && !order.sms_text.includes('STATUS_OK:') 
                                  ? order.sms_text 
                                  : `Votre code de validation ${order.service_code} est ${cleanCode}`;
                              })()}
                            </span>
                          </div>
                        ) : actualStatus === 'waiting' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-[2.5px] border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            <span className="text-[14px] text-gray-400">Waiting for SMS...</span>
                          </div>
                        ) : actualStatus === 'timeout' ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <span className="text-sm">⏰</span>
                            <span className="text-[14px] font-semibold">Timeout - No SMS</span>
                          </div>
                        ) : actualStatus === 'cancelled' ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <span className="text-sm">✕</span>
                            <span className="text-[14px] font-semibold">Cancelled</span>
                          </div>
                        ) : (
                          <span className="text-[14px] text-gray-400">No SMS</span>
                        )}

                        {/* Badge (40px fixe) */}
                        <div className="flex items-center justify-center w-[40px] h-[40px] bg-[#E5E5E5] text-gray-600 rounded-full flex-shrink-0">
                          <span className="text-[13px] font-semibold">{Math.floor(order.price)}</span>
                          <span className="text-[11px] ml-0.5">Ⓐ</span>
                        </div>

                        {/* Timer (only when waiting) */}
                        {actualStatus === 'waiting' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div className="text-[13px]">
                              <span className="text-gray-400">Remaining:</span>
                              <br/>
                              <span className="font-semibold text-gray-900">{formatTime(timeRemaining)}</span>
                            </div>
                          </div>
                        )}

                        {/* Menu dropdown - Only show cancel for non-received orders */}
                        {actualStatus !== 'received' && actualStatus !== 'cancelled' && actualStatus !== 'timeout' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                                <MoreVertical className="h-5 w-5 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => cancelActivation(order.id, order.order_id)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="w-9 h-9 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalOrdersPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                  disabled={ordersPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {[...Array(totalOrdersPages)].map((_, i) => {
                  const page = i + 1;
                  // Show first, last, current, and pages around current
                  if (
                    page === 1 ||
                    page === totalOrdersPages ||
                    Math.abs(page - ordersPage) <= 1
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setOrdersPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          page === ordersPage
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === ordersPage - 2 || page === ordersPage + 2) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setOrdersPage(Math.min(totalOrdersPages, ordersPage + 1))}
                  disabled={ordersPage === totalOrdersPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Payments List */}
            {paymentsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading payments...</p>
              </div>
            ) : paginatedPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">💳</span>
                </div>
                <p className="text-gray-500 mb-2">No payments yet</p>
                <p className="text-sm text-gray-400">Your payment history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{payment.type}</p>
                        <p className="text-xs text-gray-500">{payment.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                          payment.amount > 0
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          <span>{payment.amount > 0 ? '+' : ''}{Math.floor(Math.abs(payment.amount))}</span>
                          <span className="text-xs">Ⓐ</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {payment.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPaymentsPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))}
                  disabled={paymentsPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {[...Array(totalPaymentsPages)].map((_, i) => {
                  const page = i + 1;
                  if (
                    page === 1 ||
                    page === totalPaymentsPages ||
                    Math.abs(page - paymentsPage) <= 1
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setPaymentsPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          page === paymentsPage
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === paymentsPage - 2 || page === paymentsPage + 2) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setPaymentsPage(Math.min(totalPaymentsPages, paymentsPage + 1))}
                  disabled={paymentsPage === totalPaymentsPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
