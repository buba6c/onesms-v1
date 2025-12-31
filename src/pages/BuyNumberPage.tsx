import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Loader2, ShoppingCart, Shield, ChevronRight, Home } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getServiceLogo, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { getSetting } from '@/lib/settings';
import { get5simProductName } from '@/lib/service-mapping';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Wallet } from 'lucide-react';

// --- Types ---
type Service = {
    id: string;
    name: string;
    code: string;
    count: number;
    icon?: string;
    price?: number;
};

type Country = {
    id: string;
    name: string;
    code: string;
    flag: string;
    flagUrl?: string; // Premium visual
    count: number;
    price: number;
    successRate?: number;
    operator?: string;
};

// --- PRIORITY LOGIC (COPIED FROM DASHBOARD) ---
import { getAllServices } from '@/lib/sms-activate-data';

// --- PRIORITY LOGIC (DYNAMIC FROM DATA) ---
const ALL_SERVICES_DATA = getAllServices();
const SERVICE_PRIORITY = Object.fromEntries(
    ALL_SERVICES_DATA.map(s => [s.code.toLowerCase(), s.popularity])
);

const getServicePriority = (code: string): number => {
    return SERVICE_PRIORITY[code?.toLowerCase()] ?? 0;
};

export default function BuyNumberPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // --- State ---
    const [mode, setMode] = useState<'activation' | 'rent'>('activation');
    const [rentDuration, setRentDuration] = useState<'4hours' | '1day' | '1week' | '1month'>('4hours');
    const [currentStep, setCurrentStep] = useState<'service' | 'country' | 'confirm'>('service');

    const [searchService, setSearchService] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    const [searchCountry, setSearchCountry] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

    const [buying, setBuying] = useState(false);
    const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
    const [insufficientBalanceData, setInsufficientBalanceData] = useState<{ needed: number, available: number, missing: number } | null>(null);

    // --- Queries ---

    // 1. Services - MATCH DASHBOARD LOGIC
    const { data: services = [], isLoading: loadingServices } = useQuery({
        queryKey: ['available-services-sync', mode], // Unique key to avoid conflicts
        queryFn: async () => {
            // Fetch from DB just like Dashboard
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('active', true)
                .gt('total_available', 0);

            if (error) throw error;

            // Filter by category if we had one, but here we show all
            let filtered: any[] = data || [];

            // Hide 'ot'/'any' for activation/rent
            if (mode === 'activation' || mode === 'rent') {
                filtered = filtered.filter(s => s.code !== 'ot' && s.code !== 'any');
            }

            // Sort by priority then availability (Dashboard Logic)
            return filtered.map((s: any) => ({
                id: s.code,
                name: s.display_name || s.name,
                code: s.code,
                count: s.total_available || 0,
                _priority: getServicePriority(s.code)
            })).sort((a, b) => {
                if (a._priority !== b._priority) return b._priority - a._priority;
                return b.count - a.count;
            }); // Removed .map to keep cleaner code, we use .code/.name in render
        },
        staleTime: 60000 // 1 min cache
    });

    // Filter services
    const filteredServices = services.filter((s: any) =>
        s.name.toLowerCase().includes(searchService.toLowerCase()) ||
        s.code.toLowerCase().includes(searchService.toLowerCase())
    );

    // 2. Countries - MATCH DASHBOARD LOGIC (get-top-countries-by-service)
    const { data: countries = [], isLoading: loadingCountries } = useQuery({
        queryKey: ['service-countries-sync', selectedService?.code, mode, rentDuration],
        queryFn: async () => {
            if (!selectedService) return [];

            // ✅ ACTIVATION MODE
            if (mode === 'activation') {
                // 1. Fetch local DB stats first (Deep Analysis)
                const { data: dbCountries } = await supabase
                    .from('countries')
                    .select('code, success_rate')
                    .eq('active', true);

                const successRateMap = new Map(
                    dbCountries?.map((c: any) => [c.code.toLowerCase(), c.success_rate]) || []
                );

                // 2. Fetch API data
                const { data, error } = await cloudFunctions.invoke('get-top-countries-by-service', {
                    body: { service: selectedService.code }
                });

                if (error) throw error;

                return (data?.countries || [])
                    .filter((c: any) => c.count > 0 && c.price > 0)
                    .map((c: any) => {
                        // Deep Analysis Merging
                        const localRate = successRateMap.get(c.countryCode.toLowerCase());
                        const finalSuccessRate = localRate || c.successRate || null;

                        return {
                            id: c.countryId.toString(),
                            name: c.countryName,
                            code: c.countryCode,
                            flag: getFlagEmoji(c.countryCode) || '🌍',
                            flagUrl: getCountryFlag(c.countryCode), // Premium flag image
                            successRate: finalSuccessRate ? Number(finalSuccessRate.toFixed(1)) : null,
                            count: c.count,
                            price: Number(c.price.toFixed(2)),
                            operator: 'any', // SMS-Activate default
                            _compositeScore: c.compositeScore // Keep for potential sorting override
                        };
                    });
            }

            // ✅ RENT MODE
            else {
                // Convert rentDuration to rentTime for API
                const rentTimeMap: Record<string, string> = {
                    '4hours': '4',
                    '1day': '24',
                    '1week': '168',
                    '1month': '720'
                };
                const rentTime = rentTimeMap[rentDuration];

                const { data: rentData, error } = await cloudFunctions.invoke('get-rent-services', {
                    body: {
                        rentTime,
                        getCountries: true,
                        serviceCode: selectedService.code
                    }
                });

                if (error) throw error;

                // L'API retourne maintenant countries: [{ id, code, name, available, quantity, cost, sellingPrice, activationPrice }]
                const countriesArray = rentData?.countries || [];
                const MIN_PRICE_COINS = 5;

                const availableCountries = countriesArray.map((c: any) => {
                    const sellingPrice = c.sellingPrice || MIN_PRICE_COINS;
                    return {
                        id: `rent-${c.id}`,
                        name: c.name,
                        code: c.code,
                        flag: getFlagEmoji(c.code) || '🌍',
                        flagUrl: getCountryFlag(c.code), // Premium flag image
                        successRate: 85, // Default for rent
                        count: c.quantity || 0,
                        price: sellingPrice,
                        operator: 'any'
                    };
                });

                // Sort: stock first
                availableCountries.sort((a: any, b: any) => {
                    if ((a.count || 0) > 0 && (b.count || 0) === 0) return -1;
                    if ((a.count || 0) === 0 && (b.count || 0) > 0) return 1;
                    if ((a.count || 0) > 0 && (b.count || 0) > 0) return (b.count || 0) - (a.count || 0);
                    return a.name.localeCompare(b.name);
                });

                return availableCountries;
            }
        },
        enabled: !!selectedService && currentStep === 'country'
    });

    // Filter countries
    const filteredCountries = countries.filter((c: Country) =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase())
    );


    // --- Handlers ---

    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        setCurrentStep('country');
    };

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setCurrentStep('confirm');
    };

    const handleBack = () => {
        if (currentStep === 'confirm') {
            setCurrentStep('country');
            setSelectedCountry(null);
        } else if (currentStep === 'country') {
            setCurrentStep('service');
            setSelectedService(null);
        } else {
            navigate(-1); // Go back to previous page (e.g. Dashboard or Menu)
        }
    };

    const handleBuy = async () => {
        if (!selectedService || !selectedCountry || !user) return;

        setBuying(true);
        try {
            // Calculate price similarly to Dashboard
            const isRent = mode === 'rent';
            const durationMultiplier = isRent ? (
                rentDuration === '4hours' ? 1 : rentDuration === '1day' ? 3 : rentDuration === '1week' ? 15 : 50
            ) : 1;
            const finalPrice = Math.ceil(selectedCountry.price * durationMultiplier);

            // 🔍 INTELLIGENT BALANCE CHECK

            // 1. Fetch fresh balance from DB (handling frozen_balance)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('balance, frozen_balance')
                .eq('id', user.id)
                .single();

            // Fallback to store balance if DB error (safety net)
            const totalBalance = (userData as any)?.balance ?? user?.balance ?? 0;
            const frozenBalance = (userData as any)?.frozen_balance ?? 0;
            const availableBalance = totalBalance - frozenBalance;

            if (userError) {
                console.warn('[handleBuy] Error fetching balance:', userError.message);
            }

            // 2. Check sufficiency
            if (availableBalance < finalPrice) {
                const missing = finalPrice - availableBalance;
                setInsufficientBalanceData({
                    needed: finalPrice,
                    available: availableBalance,
                    missing: Math.ceil(missing)
                });
                setShowInsufficientBalanceDialog(true);
                setBuying(false); // Stop loader
                return; // Stop purchase
            }

            // --- Get Provider Mode ---
            const providerMode = await getSetting('sms_provider_mode') || 'sms-activate';
            console.log('🔄 [BuyNumberPage] Provider Strategy:', providerMode);

            // 🧠 INTELLIGENT ADAPTIVE SYSTEM
            // Check past failures to rotate provider automatically
            let adaptiveProvider = null;
            let adaptiveVeto: string | null = null;
            if (!isRent && (providerMode === 'intelligent' || providerMode === 'smart')) {
                try {
                    const { data: prediction } = await cloudFunctions.invoke('predict-best-provider', {
                        body: { userId: user.id, serviceCode: (selectedCountry as any)._service || selectedService.code, countryCode: selectedCountry.id }
                    });
                    if (prediction?.preferredProvider) {
                        adaptiveProvider = prediction.preferredProvider;
                        adaptiveVeto = prediction.veto;
                        console.log('🧠 [ADAPTIVE] Overriding provider to:', adaptiveProvider, 'Reason:', prediction.reasoning);

                        let reasonMsg = `Passage sur ${adaptiveProvider}`;
                        if (prediction.reasoning?.includes('Avoid') || prediction.veto) {
                            reasonMsg += " (Échec précédent évité 🛡️)";
                        } else if (prediction.reasoning?.includes('Global')) {
                            reasonMsg += " (Meilleur choix global 🏆)";
                        }

                        toast({
                            title: "🧠 Smart Routing",
                            description: reasonMsg,
                            duration: 3000
                        });
                    }
                } catch (predErr) {
                    console.warn('⚠️ Prediction failed:', predErr);
                }
            }

            // For rent: use _smsActivateId or strip "rent-" prefix
            // For activation: use selectedCountry.id directly
            const countryId = isRent
                ? ((selectedCountry as any)._smsActivateId || selectedCountry.id.replace('rent-', ''))
                : selectedCountry.id;

            const productCode = (selectedCountry as any)._service || selectedService.code;

            let functionName = '';
            let requestBody: any = {};

            if (isRent) {
                // RENTAL: Force SMS Activate (5sim rent support pending)
                functionName = 'buy-sms-activate-rent';
                requestBody = {
                    country: countryId,
                    operator: 'any',
                    product: productCode,
                    userId: user.id,
                    expectedPrice: finalPrice,
                    duration: rentDuration
                };
            } else {
                // ACTIVATION: Check Provider
                // 🧠 ADAPTIVE OVERRIDE (Takes precedence if set)
                const targetProvider = adaptiveProvider || providerMode;

                if (targetProvider === '5sim') {
                    functionName = 'buy-5sim-number';

                    // Map ID to Name (5sim needs 'england', 'russia' etc.)
                    let countryName = selectedCountry.name.toLowerCase();
                    if (countryName === 'united kingdom') countryName = 'england';

                    const product5sim = get5simProductName(productCode);

                    requestBody = {
                        country: countryName,
                        operator: 'any',
                        product: product5sim,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'smspva') {
                    // 🟢 USE SMSPVA
                    functionName = 'buy-smspva-number';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'onlinesim') {
                    // 🟠 USE ONLINESIM
                    functionName = 'buy-onlinesim-number';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'intelligent' || targetProvider === 'smart') {
                    // 🧠 INTELLIGENT MODE (Default Start): Try HeroSMS first
                    functionName = 'buy-sms-activate-number';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else {
                    // Default / fallback / sms-activate
                    functionName = 'buy-sms-activate-number';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                }
            }

            // Show purchase in progress
            toast({
                title: `🔄 Achat en cours`,
                description: `Connexion en cours...`,
            });

            let { data: buyData, error: buyError } = await cloudFunctions.invoke(functionName, {
                body: requestBody
            });

            // Robust Error Handling with Smart Mode Fallback
            if (buyError || !buyData?.success) {
                let errorMessage = 'Order failed';
                // buyData?.error is preferred (from successful JSON parse)
                // buyError can be: { error: "...", success: false } or just an Error object
                if (buyData?.error) {
                    errorMessage = buyData.error;
                } else if (buyData?.message) {
                    errorMessage = buyData.message;
                } else if (buyError?.error) {
                    // When cloudFunctions.invoke returns { data: null, error: responseJson }
                    errorMessage = buyError.error;
                } else if (buyError?.message) {
                    errorMessage = buyError.message;
                }

                console.log('🔍 Error analysis:', { errorMessage, isSmartMode: providerMode === 'smart' || providerMode === 'intelligent' });

                // 🧠 SMART MODE: Full Waterfall Fallback
                // Chain: SMS-Activate -> 5sim -> SMSPVA -> OnlineSIM
                const isSmartMode = providerMode === 'intelligent' || providerMode === 'smart';
                const isNoNumbers = errorMessage.toUpperCase().includes('NO_NUMBERS') ||
                    errorMessage.toUpperCase().includes('NO_BALANCE') ||
                    errorMessage.toUpperCase().includes('TOO MANY REQUESTS') ||
                    errorMessage.includes('not found') ||
                    errorMessage.includes('Price not found');

                if (isSmartMode && isNoNumbers) {
                    // console.log('🧠 Smart mode: Primary failed, starting fallback chain...');

                    // Helper to try a provider and throw if fails
                    const tryProvider = async (providerName: string, funcName: string, body: any) => {
                        console.log(`🧠 Smart mode: Trying ${providerName}...`);
                        const { data: pData, error: pError } = await cloudFunctions.invoke(funcName, { body });

                        // Check for error
                        if (pError || !pData?.success) {
                            const err = pData?.error || pError?.message || 'Unknown error';
                            // console.log(`❌ ${providerName} failed: ${err}`);
                            throw new Error(err);
                        }
                        return pData;
                    };

                    let successData = null;

                    // 1. Try SMSPVA (Backup 1 - High Quality / Real SIM)
                    if (!successData && functionName !== 'buy-smspva-number' && adaptiveVeto !== 'smspva') {
                        try {
                            const body = {
                                country: countryId, // SMSPVA uses numeric or ISO, smart mapping in function
                                operator: 'any',
                                product: productCode,
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('SMSPVA', 'buy-smspva-number', body);
                            console.log('✅ SMSPVA fallback succeeded');
                        } catch (e) {
                            // Continue
                        }
                    }

                    // 2. Try 5sim (Backup 2 - High Volume)
                    if (!successData && functionName !== 'buy-5sim-number' && adaptiveVeto !== '5sim') {
                        try {
                            let countryName = selectedCountry.name.toLowerCase();
                            if (countryName === 'united kingdom') countryName = 'england';

                            const body = {
                                country: countryName,
                                operator: 'any',
                                product: get5simProductName(productCode),
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('5sim', 'buy-5sim-number', body);
                            console.log('✅ 5sim fallback succeeded');
                        } catch (e) {
                            // Continue to next provider
                        }
                    }

                    // 3. Try OnlineSIM (Backup 3)
                    if (!successData && functionName !== 'buy-onlinesim-number') {
                        try {
                            const body = {
                                country: countryId, // OnlineSIM uses numeric
                                operator: 'any',
                                product: productCode,
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('OnlineSIM', 'buy-onlinesim-number', body);
                            console.log('✅ OnlineSIM fallback succeeded');
                        } catch (e) {
                            // Continue
                        }
                    }

                    if (successData) {
                        // Success! Update buyData
                        buyData = successData;
                    } else {
                        // All fallbacks failed
                        throw new Error(errorMessage + ' (All providers failed)');
                    }

                } else {
                    // Not smart mode or not a recoverable error
                    throw new Error(errorMessage);
                }
            }

            // Success Updates
            // Track which provider was actually used (for status check)
            // CRITICAL: Check buyData.data.provider FIRST (set by edge functions)
            // This ensures we use the correct status checker even after smart fallback
            const responseProvider = buyData?.data?.provider;
            let usedProvider = 'sms-activate'; // default

            if (responseProvider) {
                // Provider explicitly set in response (most reliable)
                usedProvider = responseProvider;
                console.log('✅ Provider from response:', usedProvider);
            } else {
                // Fallback: infer from function name (less reliable)
                if (functionName.includes('5sim')) {
                    usedProvider = '5sim';
                } else if (functionName.includes('smspva')) {
                    usedProvider = 'smspva';
                } else if (functionName.includes('onlinesim')) {
                    usedProvider = 'onlinesim';
                }
                console.log('⚠️ Provider inferred from function:', usedProvider);
            }

            // 1. Invalidate Balance
            queryClient.invalidateQueries({ queryKey: ['user-balance'] });

            // 2. Invalidate specific lists
            if (isRent) {
                queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['active-numbers'] });

                // 3. IMMEDIATE STATUS CHECK (Critical for Activation)
                // Use provider-specific status checker based on ACTUAL provider
                let statusCheckerFunction = 'check-sms-activate-status';
                if (usedProvider === '5sim') {
                    statusCheckerFunction = 'check-5sim-status';
                } else if (usedProvider === 'onlinesim') {
                    statusCheckerFunction = 'check-onlinesim-status';
                } else if (usedProvider === 'smspva') {
                    statusCheckerFunction = 'check-smspva-status';
                }

                console.log(`📞 Status check: ${statusCheckerFunction} for activation ${buyData.data.id}`);

                setTimeout(async () => {
                    try {
                        await cloudFunctions.invoke(statusCheckerFunction, {
                            body: {
                                activationId: buyData.data.id,
                                userId: user?.id
                            }
                        });
                        // Invalidate again after check
                        queryClient.invalidateQueries({ queryKey: ['active-numbers'] });
                    } catch (e) {
                        // Silent fail on background check
                        console.warn('⚠️ Background status check failed:', e);
                    }
                }, 1000);
            }

            toast({
                title: isRent ? t('toasts.numberRented', 'Number Rented') : t('toasts.numberActivated', 'Number Activated'),
                description: isRent
                    ? `${buyData.data.phone || 'New Number'} - ${t('toasts.rentalSuccess', 'Rental active')}`
                    : `${buyData.data.phone || 'New Number'} - ${t('toasts.activationSuccess', 'Ready to receive SMS')}`,
            });

            // Redirect to Dashboard
            navigate('/dashboard');

        } catch (err: any) {
            toast({
                title: t('common.error'),
                description: err.message || t('toasts.orderError'),
                variant: 'destructive'
            });
        } finally {
            setBuying(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            <div className="p-4 max-w-lg mx-auto space-y-4">

                {currentStep === 'service' && (
                    <>
                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                            <button
                                onClick={() => setMode('activation')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'activation' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                            >
                                {t('common.activation')}
                            </button>
                            <button
                                onClick={() => setMode('rent')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'rent' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
                            >
                                {t('common.rent')}
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search service..."
                                className="pl-9 h-12 bg-white rounded-xl border-gray-200 shadow-sm focus:border-blue-500 transition-all text-base"
                                value={searchService}
                                onChange={(e) => setSearchService(e.target.value)}
                            />
                        </div>

                        {loadingServices ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm">Loading services...</p>
                            </div>
                        ) : (
                            <>
                                {/* Special Service for Rent Mode - Location complète */}
                                {mode === 'rent' && (
                                    <div className="mb-4">
                                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest mb-2 px-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                                            Exclusivité
                                        </p>
                                        <div
                                            onClick={() => handleServiceSelect({ id: 'full', name: 'Location complète', code: 'full', count: 999 })}
                                            className="bg-white border-2 border-purple-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all active:scale-[0.98] group relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full -mr-10 -mt-10"></div>

                                            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                <Home className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 z-10">
                                                <h3 className="font-black text-gray-900 text-lg">Location Complète</h3>
                                                <p className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">Recevoir les SMS de <strong>tous les services</strong></p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-all">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-2 pb-24">
                                    {/* 🔙 BACK CARD (Base on "on the cards" request) */}
                                    <div
                                        onClick={() => navigate('/dashboard')}
                                        className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all group border border-white/10"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-inner border border-white/20">
                                            <ChevronLeft className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">{t('common.home', 'Accueil')}</h3>
                                            <p className="text-xs text-blue-50 font-medium opacity-90">Retour au tableau de bord</p>
                                        </div>
                                    </div>

                                    {filteredServices.map((service: any) => (
                                        <div
                                            key={service.id}
                                            onClick={() => handleServiceSelect(service)}
                                            className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:border-blue-500 hover:shadow-md group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl shadow-inner border border-gray-100 group-hover:bg-blue-50 transition-colors">
                                                <img
                                                    src={getServiceLogo(service.code)}
                                                    className="w-7 h-7 object-contain drop-shadow-sm"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    alt=""
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{service.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                                                        {service.count} available
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {currentStep === 'country' && selectedService && (
                    <>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-blue-100">
                                <img
                                    src={getServiceLogo(selectedService.code)}
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    alt=""
                                />
                            </div>
                            <div>
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Service</p>
                                <p className="font-bold text-blue-900">{selectedService.name}</p>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search country..."
                                className="pl-9 h-12 bg-white rounded-xl border-gray-200 shadow-sm focus:border-blue-500 transition-all text-base"
                                value={searchCountry}
                                onChange={(e) => setSearchCountry(e.target.value)}
                            />
                        </div>

                        {loadingCountries ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm">{t('buyNumber.findingBestPrices', 'Finding best prices...')}</p>
                            </div>
                        ) : (
                            <div className="grid gap-2 pb-24">
                                {/* 🔙 BACK CARD (Base on "on the cards" request) */}
                                <div
                                    onClick={() => handleBack()}
                                    className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-3 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all group border border-white/10"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-inner border border-white/20">
                                        <ChevronLeft className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">Changer de service</h3>
                                        <p className="text-xs text-blue-50 font-medium opacity-90">Retour à la liste</p>
                                    </div>
                                </div>

                                {filteredCountries.map(country => (
                                    <div
                                        key={country.id}
                                        onClick={() => handleCountrySelect(country)}
                                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:border-blue-500 hover:shadow-md group"
                                    >
                                        <div className="w-12 h-10 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 group-hover:shadow-md transition-all relative">
                                            {/* fallback emoji underneath */}
                                            <span className="absolute text-2xl opacity-0">{country.flag}</span>
                                            <img
                                                src={country.flagUrl || getCountryFlag(country.code)}
                                                alt={country.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; (e.target as HTMLImageElement).parentElement!.innerText = country.flag; }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                                                {country.name}
                                                {country.successRate && country.successRate > 80 && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-wider">
                                                        {t('buyNumber.top', 'Top')}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                {/* REMOVED DUPLICATE HARDCODED LINE */}
                                                {country.successRate ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-500 font-medium">{country.count.toLocaleString()} {t('buyNumber.available', 'available')}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-2" />
                                                        <span className="text-[11px] text-green-700 font-bold">
                                                            {country.successRate}{t('buyNumber.success', '% Success')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    // Fallback if no success rate, just show available
                                                    <span className="text-xs text-gray-500 font-medium">{country.count.toLocaleString()} {t('buyNumber.available', 'available')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                                                <span className="block font-black text-blue-600 text-sm group-hover:text-white">{country.price} <span className="text-[10px] font-normal opacity-80">Ⓐ</span></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {currentStep === 'confirm' && selectedService && selectedCountry && (
                    <div className="pt-4">
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 text-center space-y-6">

                            <div className="w-20 h-20 bg-blue-50 rounded-full mx-auto flex items-center justify-center animate-bounce-slow">
                                <ShoppingCart className="w-10 h-10 text-blue-600" />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{t('buyNumber.confirmOrder', 'Confirm Order')}</h2>
                                <p className="text-gray-500 mt-2">{t('buyNumber.confirmDesc', 'You are about to purchase a number.')}</p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-left">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">{t('buyNumber.service', 'Service')}</span>
                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                        {selectedService.name}
                                    </div>
                                </div>
                                <div className="bg-gray-200 h-px w-full" />
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">{t('buyNumber.country', 'Country')}</span>
                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                        <img
                                            src={selectedCountry.flagUrl || getCountryFlag(selectedCountry.code)}
                                            className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; }} // Fallback to transparent pixel if fails
                                        />
                                        {selectedCountry.name}
                                    </div>
                                </div>

                                {/* Rent Duration Selector */}
                                {mode === 'rent' && (
                                    <>
                                        <div className="bg-gray-200 h-px w-full" />
                                        <div className="py-2">
                                            <span className="text-gray-500 text-sm block mb-2">{t('buyNumber.duration', 'Duration')}</span>
                                            <div className="grid grid-cols-4 gap-1">
                                                {[
                                                    { v: '4hours', l: '4H' }, { v: '1day', l: '1D' },
                                                    { v: '1week', l: '1W' }, { v: '1month', l: '1M' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.v}
                                                        onClick={() => setRentDuration(opt.v as any)}
                                                        className={`py-1 rounded-md text-xs font-bold transition-all ${rentDuration === opt.v ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
                                                    >
                                                        {opt.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="bg-gray-200 h-px w-full" />
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-gray-500 text-sm">Total Price</span>
                                    <span className="font-black text-blue-600">
                                        {mode === 'rent'
                                            ? Math.ceil(selectedCountry.price * (rentDuration === '4hours' ? 1 : rentDuration === '1day' ? 3 : rentDuration === '1week' ? 15 : 50))
                                            : Math.ceil(selectedCountry.price)
                                        } Ⓐ
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl text-left">
                                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    If you don't receive an SMS within 20 minutes, the money will be automatically refunded to your balance.
                                </p>
                            </div>

                            <Button
                                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] transition-all"
                                onClick={handleBuy}
                                disabled={buying}
                            >
                                {buying ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Purchasing...
                                    </>
                                ) : (
                                    t('buyNumber.confirmPurchase', 'Confirm Purchase')
                                )}
                            </Button>

                            <button
                                onClick={handleBack}
                                className="text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
                                disabled={buying}
                            >
                                {t('buyNumber.cancel', 'Cancel')}
                            </button>

                        </div>
                    </div>
                )}

            </div>

            {/* Insufficient Balance Dialog */}
            <Dialog open={showInsufficientBalanceDialog} onOpenChange={setShowInsufficientBalanceDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                            </div>
                            <DialogTitle className="text-lg sm:text-xl">{t('insufficientBalance.title', 'Solde insuffisant')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-sm sm:text-base">
                            {t('insufficientBalance.description', 'Vous n\'avez pas assez de crédits pour effectuer cette action.')}
                        </DialogDescription>
                    </DialogHeader>

                    {insufficientBalanceData && (
                        <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
                            <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-500">{t('insufficientBalance.needed', 'Nécessaire')}</span>
                                <span className="font-bold text-base sm:text-lg">{insufficientBalanceData.needed} Ⓐ</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-500">{t('insufficientBalance.available', 'Disponible')}</span>
                                <span className="font-semibold text-base sm:text-lg">{insufficientBalanceData.available} Ⓐ</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 sm:p-3 bg-red-50 rounded-lg border border-red-200">
                                <span className="text-sm text-red-600 font-medium">{t('insufficientBalance.missing', 'Manquant')}</span>
                                <span className="font-bold text-base sm:text-lg text-red-600">{insufficientBalanceData.missing} Ⓐ</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowInsufficientBalanceDialog(false)}
                            className="w-full sm:w-auto order-2 sm:order-1"
                        >
                            {t('common.cancel', 'Annuler')}
                        </Button>
                        <Button
                            onClick={() => {
                                setShowInsufficientBalanceDialog(false);
                                navigate('/top-up');
                            }}
                            className="w-full sm:w-auto gap-2 order-1 sm:order-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
                        >
                            <Wallet className="w-4 h-4" />
                            {t('insufficientBalance.topUp', 'Recharger')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
