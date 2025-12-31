import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  CheckCircle2,
  Gift,
  ChevronLeft,
  Minus,
  Plus,
  CreditCard,
  ChevronRight,
  Shield,
  X,
  AlertCircle
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { packagesApi } from '@/lib/api/packages';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { ActivationPackage } from '@/lib/api/packages';

interface PaymentProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  is_active: boolean;
  priority: number;
  is_default: boolean;
  config?: any;
}

export default function TopUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount_amount?: number;
    final_amount?: number;
    message?: string;
    error?: string;
    promo_code_id?: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Payment Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Load packages
  const { data: packages = [], isLoading: loadingPackages } = useQuery<ActivationPackage[]>({
    queryKey: ['activation-packages'],
    queryFn: packagesApi.getActivePackages,
  });

  // Check if promo field is enabled
  const { data: promoFieldVisible = true } = useQuery({
    queryKey: ['promo-field-visible'],
    queryFn: async () => {
      try {
        const result = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'promo_code_field_visible')
          .single();
        return result.data?.value !== 'false';
      } catch {
        return true;
      }
    },
    staleTime: 60000,
  });

  // Payment Providers
  const { data: paymentProviders = [] } = useQuery<PaymentProvider[]>({
    queryKey: ['payment-providers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      return (data as any[]) || [];
    },
    staleTime: 60000,
  });

  // Auto-select package & provider
  useEffect(() => {
    if (packages.length > 0 && !selectedPackageId) {
      const popularPackage = packages.find(pkg => pkg.is_popular);
      setSelectedPackageId(popularPackage?.id || packages[0].id);
    }
  }, [packages, selectedPackageId]);

  useEffect(() => {
    if (paymentProviders.length > 0 && !selectedProvider) {
      const defaultProvider = paymentProviders.find(p => p.is_default);
      setSelectedProvider(defaultProvider?.provider_code || paymentProviders[0].provider_code);
    }
  }, [paymentProviders, selectedProvider]);

  // Reset promo
  useEffect(() => {
    if (promoResult?.valid && promoCode) {
      setPromoResult(null);
    }
  }, [selectedPackageId]);

  // Validate promo
  const validatePromoCode = async () => {
    if (!promoCode.trim() || !user || !selectedPackageId) return;
    const packageData = packages.find(pkg => pkg.id === selectedPackageId);
    if (!packageData) return;

    setValidatingPromo(true);
    try {
      const result = await (supabase as any).rpc('validate_promo_code', {
        p_code: promoCode.trim(),
        p_user_id: user.id,
        p_purchase_amount: packageData.activations
      });

      const { data, error } = result || {};
      if (error) throw error;
      if (data) {
        setPromoResult(data);
        if (data.valid) toast({ title: '🎉 Code valid !', description: data.message });
      }
    } catch (error: any) {
      setPromoResult({ valid: false, error: 'Invalid code' });
    } finally {
      setValidatingPromo(false);
    }
  };

  // Mutation
  const rechargeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackageId) throw new Error('Select a package');
      if (!user) throw new Error('Login required');
      const packageData = packages.find(pkg => pkg.id === selectedPackageId);
      if (!packageData) throw new Error('Package not found');

      const amount = packageData.price_xof;
      const bonusActivations = promoResult?.valid ? promoResult.discount_amount || 0 : 0;
      const totalActivations = packageData.activations + bonusActivations;

      const returnUrl = window.location.hostname === 'localhost'
        ? 'https://onesms-sn.com/dashboard?payment=success'
        : `${window.location.origin}/dashboard?payment=success`;
      const cancelUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5173/topup?payment=cancel'
        : `${window.location.origin}/topup?payment=cancel`;

      const metadata = {
        user_id: user.id,
        type: 'recharge',
        activations: totalActivations,
        base_activations: packageData.activations,
        bonus_activations: bonusActivations,
        package_id: packageData.id,
        promo_code_id: promoResult?.valid ? promoResult.promo_code_id : null,
        promo_code: promoResult?.valid ? promoCode.trim().toUpperCase() : null
      };

      if (selectedProvider === 'wave') {
        const { data: waveProvider } = await supabase.from('payment_providers').select('config').eq('provider_code', 'wave').single() as { data: { config: any } | null, error: any };
        if (!waveProvider) throw new Error('Wave unavailable');
        const waveUrl = waveProvider.config?.payment_link_template?.replace('{amount}', amount.toString());
        if (!waveUrl) throw new Error('Wave config error');

        const params = new URLSearchParams({
          amount: amount.toString(),
          activations: totalActivations.toString(),
          base_activations: packageData.activations.toString(),
          bonus_activations: bonusActivations.toString(),
          wave_url: waveUrl
        });
        return { redirect_url: `/wave-proof?${params.toString()}`, isLocalRedirect: true };

      } else if (selectedProvider === 'paydunya') {
        const { data, error } = await cloudFunctions.invoke('paydunya-create-payment', {
          body: {
            amount, userId: user.id, email: user.email, phone: user.user_metadata?.phone,
            metadata: { ...metadata, description: `Topup ${totalActivations} ONE SMS`, return_url: returnUrl, cancel_url: cancelUrl }
          }
        });
        if (error || !data?.payment_url) throw new Error(error?.message || 'Payment init failed');
        return { redirect_url: data.payment_url };

      } else if (selectedProvider === 'moneroo') {
        const { data, error } = await cloudFunctions.invoke('init-moneroo-payment', {
          body: {
            amount, currency: 'XOF', description: `Topup ${totalActivations} ONE SMS`,
            customer: { email: user.email, first_name: user.user_metadata?.first_name || 'Client', last_name: 'ONESMS', phone: user.user_metadata?.phone },
            return_url: returnUrl,
            metadata
          }
        });
        if (error || !data?.data?.checkout_url) throw new Error(error?.message || 'Payment init failed');
        return { redirect_url: data.data.checkout_url };
      } else {
        const { data, error } = await cloudFunctions.invoke('init-moneyfusion-payment', {
          body: {
            amount, currency: 'XOF', description: `Topup ${totalActivations} ONE SMS`,
            metadata: { ...metadata, provider: 'moneyfusion' }, return_url: returnUrl,
            customer: { email: user.email, first_name: 'Client', last_name: 'ONESMS', phone: '00000000' }
          }
        });
        if (error || !data?.checkout_url && !data?.data?.checkout_url) throw new Error(error?.message || 'Payment init failed');
        return { redirect_url: data.checkout_url || data.data.checkout_url };
      }
    },
    onSuccess: (payment) => window.location.href = payment.redirect_url,
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
  });

  // Check stock shortage mode
  const { data: isStockShortage = false } = useQuery({
    queryKey: ['stock-shortage-mode'],
    queryFn: async () => {
      try {
        const result = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'stock_shortage_mode')
          .single();
        return result.data?.value === 'true';
      } catch {
        return false;
      }
    },
    staleTime: 30000,
  });

  const selectedPackageData = packages.find(pkg => pkg.id === selectedPackageId);

  // Stepper
  const handleAmountStep = (dir: 'up' | 'down') => {
    if (!selectedPackageId || packages.length === 0) return;
    const idx = packages.findIndex(pkg => pkg.id === selectedPackageId);
    let newIdx = dir === 'up' ? idx + 1 : idx - 1;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= packages.length) newIdx = packages.length - 1;
    setSelectedPackageId(packages[newIdx].id);
  };

  const currentProvider = paymentProviders.find(p => p.provider_code === selectedProvider);

  if (loadingPackages) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">

      {/* Header with Brand Gradient */}
      <div className="sticky top-0 z-20 overflow-hidden bg-slate-50">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-100 rounded-b-[2rem] shadow-lg shadow-blue-500/20" />

        <div className="relative z-10 px-4 py-4 pt-4 pb-8">
          <div className="flex items-center gap-3 text-white mb-6">
            <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-bold">{t('topUpPage.title', 'Top Up')}</h1>
          </div>

          {/* Main Display Amount */}
          <div className="text-center text-white space-y-1">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{t('topUpPage.totalAmount', 'Total amount')}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-5xl font-black tracking-tight drop-shadow-sm">
                {selectedPackageData?.price_xof.toLocaleString() || '0'}
              </span>
              <span className="text-lg font-bold text-blue-100 mt-3">FCFA</span>
            </div>
            {selectedPackageData?.savings_percentage > 0 && (
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white mt-2">
                {t('topUpPage.save', 'Save')} {selectedPackageData.savings_percentage}%
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 max-w-lg mx-auto space-y-6">

        {/* 1. Control Panel */}
        <div className="bg-white rounded-[2rem] p-4 shadow-xl shadow-gray-200/60 border border-gray-100">

          {/* Stepper */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-2 mb-6">
            <button
              onClick={() => handleAmountStep('down')}
              className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-95 transition-all"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900">{selectedPackageData?.activations} {t('topUpPage.credits', 'CREDITS')}</p>
            </div>
            <button
              onClick={() => handleAmountStep('up')}
              className="w-12 h-12 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Package Pills */}
          <div className="space-y-3">
            <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">{t('topUpPage.quickSelect', 'Quick Select')}</p>
            <div className="grid grid-cols-2 gap-3">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative p-4 rounded-2xl border transition-all text-left ${selectedPackageId === pkg.id
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 shadow-sm'
                    }`}
                >
                  {/* Popular Badge */}
                  {pkg.is_popular && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${selectedPackageId === pkg.id
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-100 text-blue-600'
                      }`}>
                      Popular
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className={`text-2xl font-black ${selectedPackageId === pkg.id ? 'text-white' : 'text-gray-900'}`}>
                      {pkg.activations} <span className="text-base">Ⓐ</span>
                    </span>
                    <span className={`text-xs font-medium ${selectedPackageId === pkg.id ? 'text-blue-100' : 'text-gray-400'}`}>
                      {pkg.price_xof.toLocaleString()} FCFA
                    </span>
                  </div>
                  {selectedPackageId === pkg.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 2. Promo Code (Collapsible) */}
        {promoFieldVisible && (
          <div className="space-y-3">
            {promoResult?.valid ? (
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 text-white shadow-lg shadow-pink-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Gift className="w-4 h-4" />
                  {t('topUpPage.codeApplied', 'Code Applied!')}
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-md">
                  +{promoResult.discount_amount} {t('topUpPage.bonus', 'Bonus')}
                </span>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowPromoInput(!showPromoInput)}
                  className="w-full flex items-center justify-between p-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span>{t('topUpPage.haveCode', 'Do you have a promo code?')}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showPromoInput ? 'rotate-90' : ''}`} />
                </button>

                {showPromoInput && (
                  <div className="p-4 pt-0 flex gap-2 animate-in slide-in-from-top-2">
                    <Input
                      className="bg-gray-50 border-gray-200 font-bold tracking-widest uppercase"
                      placeholder={t('topUpPage.placeholderCode', 'CODE')}
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                    />
                    <Button onClick={validatePromoCode} disabled={validatingPromo} className="bg-gray-900 text-white">
                      {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t('topUpPage.apply', 'APPLY')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Text */}
        <div className="flex items-start gap-3 px-2 opacity-60">
          <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-500 leading-relaxed">
            {t('topUpPage.securityInfo', 'Secure payment encrypted. Credits are added instantly to your account after verification.')}
          </p>
        </div>

      </div>

      {/* Footer Fixed */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30">
        <div className="max-w-lg mx-auto">
          {isStockShortage ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900">Recharge indisponible</p>
                <p className="text-xs font-medium text-gray-500">Actuellement en rupture de stock de numéros.</p>
              </div>
            </div>
          ) : (
            <Button
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white font-bold text-lg shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all"
              onClick={() => rechargeMutation.mutate()}
              disabled={rechargeMutation.isPending}
            >
              {rechargeMutation.isPending ? <Loader2 className="animate-spin" /> : t('topUpPage.confirmPay', 'Confirm & Pay')}
            </Button>
          )}
        </div>
      </div>

    </div >
  );
}
