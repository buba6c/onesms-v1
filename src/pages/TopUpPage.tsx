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
  AlertCircle,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { packagesApi } from '@/lib/api/packages';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';

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

const getCustomBonus = (baseActs: number) => {
  if (baseActs >= 50000) return 0.30;
  if (baseActs >= 15000) return 0.20;
  if (baseActs >= 5000) return 0.15;
  if (baseActs >= 2000) return 0.05;
  return 0;
};

const providerLogos: Record<string, { label: string; colors: string; icon: string }> = {
  wave:        { label: 'Wave',        colors: 'from-blue-500 to-blue-600',   icon: '🌊' },
  paydunya:    { label: 'PayDunya',    colors: 'from-emerald-500 to-teal-600', icon: '💳' },
  moneroo:     { label: 'Moneroo',     colors: 'from-purple-500 to-indigo-600', icon: '💎' },
  moneyfusion: { label: 'MoneyFusion', colors: 'from-amber-500 to-orange-600', icon: '💸' },
  paytech:     { label: 'PayTech',     colors: 'from-cyan-500 to-blue-600',   icon: '🔐' },
};

export default function TopUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('2000');
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

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

  // Payment provider
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

  // Auto-select: prefer non-moneroo, then default, then first available
  const preferredProviders = paymentProviders.filter(p => p.provider_code !== 'moneroo');
  const fallbackList = preferredProviders.length > 0 ? preferredProviders : paymentProviders;
  const activeProvider = selectedProvider || fallbackList.find(p => p.is_default)?.provider_code || fallbackList[0]?.provider_code;

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
    const packageData = selectedPackageId === 'custom' 
      ? { activations: parseInt(customAmount) || 2000 }
      : packages.find(pkg => pkg.id === selectedPackageId);
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
        if (data.valid) toast({ title: '🎉 Code valide !', description: data.message });
      }
    } catch (error: any) {
      setPromoResult({ valid: false, error: 'Code invalide' });
    } finally {
      setValidatingPromo(false);
    }
  };

  // Mutation
  const rechargeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackageId) throw new Error('Sélectionnez un package');
      if (!user) throw new Error('Connexion requise');
      
      let finalProvider = activeProvider;
      if (!finalProvider) {
        // Fallback: fetch directly if state was stale or loading
        const { data } = await supabase.from('payment_providers').select('*').eq('is_active', true).order('priority', { ascending: true });
        const list = (data as any[]) || [];
        const preferred = list.filter(p => p.provider_code !== 'moneroo');
        const fallback = preferred.length > 0 ? preferred : list;
        finalProvider = selectedProvider || fallback.find(p => p.is_default)?.provider_code || fallback[0]?.provider_code;
      }
      
      if (!finalProvider) throw new Error('Aucune méthode de paiement disponible');
      let packageData;
      
      if (selectedPackageId === 'custom') {
        const baseActs = parseInt(customAmount) || 2000;
        if (baseActs < 2000) throw new Error('Minimum 2000 Ⓐ requis');
        const fcfa = baseActs * 100;
        const bonusP = getCustomBonus(baseActs);
        const bonusActs = Math.floor(baseActs * bonusP);
        const totalActs = baseActs + bonusActs;
        packageData = { id: 'custom', activations: totalActs, price_xof: fcfa };
      } else {
        packageData = packages.find(pkg => pkg.id === selectedPackageId);
      }
      
      if (!packageData) throw new Error('Package non trouvé');

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

      if (finalProvider === 'wave') {
        const { data: waveProvider } = await supabase.from('payment_providers').select('config').eq('provider_code', 'wave').single() as { data: { config: any } | null, error: any };
        if (!waveProvider) throw new Error('Wave indisponible');
        const waveUrl = waveProvider.config?.payment_link_template?.replace('{amount}', amount.toString());
        if (!waveUrl) throw new Error('Configuration Wave manquante');
        const params = new URLSearchParams({
          amount: amount.toString(),
          activations: totalActivations.toString(),
          base_activations: packageData.activations.toString(),
          bonus_activations: bonusActivations.toString(),
          wave_url: waveUrl
        });
        return { redirect_url: `/wave-proof?${params.toString()}`, isLocalRedirect: true };
      } else if (finalProvider === 'paydunya') {
        const { data, error } = await cloudFunctions.invoke('paydunya-create-payment', {
          body: {
            amount, userId: user.id, email: user.email, phone: user.user_metadata?.phone,
            metadata: { ...metadata, description: `Topup ${totalActivations} ONE SMS`, return_url: returnUrl, cancel_url: cancelUrl }
          }
        });
        if (error || !data?.payment_url) throw new Error(error?.message || 'Échec du paiement');
        return { redirect_url: data.payment_url };
      } else if (finalProvider === 'moneroo') {
        const { data, error } = await cloudFunctions.invoke('init-moneroo-payment', {
          body: {
            amount, currency: 'XOF', description: `Topup ${totalActivations} ONE SMS`,
            customer: { email: user.email, first_name: user.user_metadata?.first_name || 'Client', last_name: 'ONESMS', phone: user.user_metadata?.phone },
            return_url: returnUrl,
            metadata
          }
        });
        if (error || !data?.data?.checkout_url) throw new Error(error?.message || 'Échec du paiement');
        return { redirect_url: data.data.checkout_url };
      } else {
        const { data, error } = await cloudFunctions.invoke('init-moneyfusion-payment', {
          body: {
            amount, currency: 'XOF', description: `Topup ${totalActivations} ONE SMS`,
            metadata: { ...metadata, provider: 'moneyfusion' }, return_url: returnUrl,
            customer: { email: user.email, first_name: 'Client', last_name: 'ONESMS', phone: '00000000' }
          }
        });
        if (error || !data?.checkout_url && !data?.data?.checkout_url) throw new Error(error?.message || 'Échec du paiement');
        return { redirect_url: data.checkout_url || data.data.checkout_url };
      }
    },
    onSuccess: (payment) => window.location.href = payment.redirect_url,
    onError: (e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' })
  });

  // Check stock shortage
  const { data: isStockShortage = false } = useQuery({
    queryKey: ['stock-shortage'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'stock_shortage_mode')
        .single();
      return (data as any)?.value === 'true';
    },
    staleTime: 60000,
  });

  const customBaseActs = parseInt(customAmount) || 0;
  const customFcfa = customBaseActs * 100;
  const customBonusPercent = getCustomBonus(customBaseActs);
  const customBonusActs = Math.floor(customBaseActs * customBonusPercent);
  const customTotalActs = customBaseActs + customBonusActs;

  const selectedPackageData = selectedPackageId === 'custom'
    ? { id: 'custom', price_xof: customFcfa, activations: customTotalActs, savings_percentage: Math.round(customBonusPercent * 100) }
    : packages.find(pkg => pkg.id === selectedPackageId);

  // Stepper
  const handleAmountStep = (dir: 'up' | 'down') => {
    if (!selectedPackageId || packages.length === 0) return;
    
    if (selectedPackageId === 'custom') {
      const amt = parseInt(customAmount) || 2000;
      const step = 500;
      let newAmt = dir === 'up' ? amt + step : amt - step;
      if (newAmt < 2000) {
        if (dir === 'down') setSelectedPackageId(packages[packages.length - 1]?.id);
        else setCustomAmount('2000');
      } else {
        setCustomAmount(newAmt.toString());
      }
      return;
    }

    const idx = packages.findIndex(pkg => pkg.id === selectedPackageId);
    let newIdx = dir === 'up' ? idx + 1 : idx - 1;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= packages.length) {
      setSelectedPackageId('custom');
      return;
    }
    setSelectedPackageId(packages[newIdx].id);
  };

  if (loadingPackages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-36">

      {/* ═══════════════════════════════════════ */}
      {/* HEADER — Gradient Hero with Amount      */}
      {/* ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #003a8c 0%, #004BB5 30%, #0088E0 70%, #00C4FF 100%)' }} />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        
        <div className="relative z-10 px-4 pt-4 pb-10">
          {/* Top bar */}
          <div className="flex items-center gap-3 text-white mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">{t('topUpPage.title', 'Recharger')}</h1>
          </div>

          {/* Central amount display */}
          <div className="text-center text-white">
            <p className="text-blue-200 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
              {t('topUpPage.totalAmount', 'Montant total')}
            </p>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-5xl font-black tracking-tighter tabular-nums">
                {(selectedPackageData?.price_xof || 0).toLocaleString('fr-FR')}
              </span>
              <span className="text-lg font-bold text-blue-200">FCFA</span>
            </div>
            
            {/* Credits badge */}
            <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-bold text-white">
                {(selectedPackageData?.activations || 0).toLocaleString('fr-FR')} Ⓐ
              </span>
              {(selectedPackageData?.savings_percentage || 0) > 0 && (
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-400/20">
                  +{selectedPackageData!.savings_percentage}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* MAIN CONTENT                            */}
      {/* ═══════════════════════════════════════ */}
      <div className="px-4 -mt-4 relative z-10 max-w-lg mx-auto space-y-4">

        {/* ── Section 1: Stepper + Packages ── */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-gray-200/60 border border-gray-100 overflow-hidden">
          
          {/* Stepper control */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1.5">
              <button
                onClick={() => handleAmountStep('down')}
                className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 active:scale-90 transition-all hover:shadow-md"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center px-4">
                <p className="text-base font-black text-gray-900 tabular-nums">
                  {(selectedPackageData?.activations || 0).toLocaleString('fr-FR')} Ⓐ
                </p>
              </div>
              <button
                onClick={() => handleAmountStep('up')}
                className="w-11 h-11 rounded-xl bg-blue-600 shadow-md shadow-blue-500/30 flex items-center justify-center text-white active:scale-90 transition-all hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="px-4">
            <div className="h-px bg-gray-100" />
          </div>

          {/* Package grid */}
          <div className="p-4 pt-3">
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mb-3">
              {t('topUpPage.quickSelect', 'Sélection rapide')}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {packages.map(pkg => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`relative p-3.5 rounded-2xl border-2 transition-all text-left active:scale-[0.97] ${isSelected
                      ? 'text-white border-transparent shadow-lg shadow-[#004BB5]/30'
                      : 'bg-white text-gray-700 border-gray-100 hover:border-blue-200 hover:shadow-sm'
                    }`}
                    style={isSelected ? { background: 'linear-gradient(135deg, #003a8c 0%, #004BB5 30%, #0088E0 70%, #00C4FF 100%)' } : {}}
                  >
                    {pkg.is_popular && (
                      <div className={`absolute -top-2.5 left-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5 ${isSelected
                        ? 'bg-white text-[#004BB5] shadow-sm'
                        : 'bg-blue-50 text-[#004BB5]'
                      }`}>
                        Populaire
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                      <span className={`text-xl font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {pkg.activations.toLocaleString('fr-FR')}
                        <span className="text-sm ml-0.5">Ⓐ</span>
                      </span>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                        {(pkg.price_xof).toLocaleString('fr-FR')} FCFA
                      </span>
                      {(pkg.savings_percentage || 0) > 0 && (
                        <span className={`text-[10px] font-black mt-0.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`}>
                          +{pkg.savings_percentage}% bonus
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5">
                        <CheckCircle2 className="w-5 h-5 text-white/80" />
                      </div>
                    )}
                  </button>
                );
              })}
              
              {/* Custom amount card */}
              <div 
                className={`col-span-2 relative p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer active:scale-[0.99] ${selectedPackageId === 'custom'
                  ? 'text-white border-transparent shadow-lg shadow-[#004BB5]/30'
                  : 'bg-white text-gray-600 border-gray-100 hover:border-blue-200'
                }`}
                onClick={() => setSelectedPackageId('custom')}
                role="button"
                style={selectedPackageId === 'custom' ? { background: 'linear-gradient(135deg, #003a8c 0%, #004BB5 30%, #0088E0 70%, #00C4FF 100%)' } : {}}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black uppercase tracking-wider ${selectedPackageId === 'custom' ? 'text-white' : 'text-gray-500'}`}>
                      Montant personnalisé
                    </span>
                  </div>
                  
                  {selectedPackageId === 'custom' ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="2000"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-white/15 border border-white/25 text-white placeholder:text-white/40 rounded-xl px-3 py-2 font-black text-lg outline-none focus:bg-white/20 transition-colors tabular-nums"
                          placeholder="2000+"
                        />
                        <span className="font-black text-white text-lg">Ⓐ</span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-200 bg-white/10 px-2.5 py-1 rounded-lg">
                          {customFcfa.toLocaleString('fr-FR')} FCFA
                        </span>
                        {customBonusActs > 0 && (
                          <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-400/20">
                            +{customBonusActs.toLocaleString('fr-FR')} Ⓐ ({Math.round(customBonusPercent * 100)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-gray-400">
                      À partir de 200 000 FCFA
                    </span>
                  )}
                </div>
                {selectedPackageId === 'custom' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-white/80" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>




        {/* ── Section 3: Promo Code ── */}
        {promoFieldVisible && (
          <div>
            {promoResult?.valid ? (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Code appliqué !</p>
                    <p className="text-[11px] text-emerald-100 font-medium">{promoCode.toUpperCase()}</p>
                  </div>
                </div>
                <span className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur-sm">
                  +{promoResult.discount_amount} Ⓐ
                </span>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowPromoInput(!showPromoInput)}
                  className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    <span>{t('topUpPage.haveCode', 'Code promo ?')}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showPromoInput ? 'rotate-90' : ''}`} />
                </button>

                {showPromoInput && (
                  <div className="p-4 pt-0 flex gap-2">
                    <Input
                      className="bg-gray-50 border-gray-200 font-bold tracking-widest uppercase rounded-xl h-11"
                      placeholder="CODE"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && validatePromoCode()}
                    />
                    <Button 
                      onClick={validatePromoCode} 
                      disabled={validatingPromo || !promoCode.trim()} 
                      className="bg-gray-900 text-white h-11 rounded-xl px-5 font-bold hover:bg-black"
                    >
                      {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
                    </Button>
                  </div>
                )}
                {promoResult && !promoResult.valid && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {promoResult.error || 'Code invalide'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Security note ── */}
        <div className="flex items-center gap-2.5 px-1 py-2">
          <Shield className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            {t('topUpPage.securityInfo', 'Paiement sécurisé et chiffré. Les crédits sont ajoutés instantanément après vérification.')}
          </p>
        </div>

      </div>

      {/* ═══════════════════════════════════════ */}
      {/* FIXED BOTTOM CTA                        */}
      {/* ═══════════════════════════════════════ */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 z-30">
        <div className="max-w-lg mx-auto">
          {isStockShortage ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-sm">Recharge indisponible</p>
                <p className="text-xs font-medium text-gray-500">Rupture de stock temporaire.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Summary line */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-400 font-medium">
                  {(selectedPackageData?.activations || 0).toLocaleString('fr-FR')} Ⓐ
                  {promoResult?.valid && <span className="text-emerald-500"> +{promoResult.discount_amount} bonus</span>}
                </span>
                <span className="text-sm font-black text-gray-900">
                  {(selectedPackageData?.price_xof || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <Button
                className="w-full h-[52px] rounded-2xl text-white font-bold text-base shadow-lg shadow-[#004BB5]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0"
                style={{ background: 'linear-gradient(135deg, #003a8c 0%, #004BB5 30%, #0088E0 70%, #00C4FF 100%)' }}
                onClick={() => rechargeMutation.mutate()}
                disabled={rechargeMutation.isPending}
              >
                {rechargeMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    {t('topUpPage.confirmPay', 'Payer maintenant')}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
