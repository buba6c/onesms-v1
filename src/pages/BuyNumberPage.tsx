import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Loader2, ShoppingCart, Shield, ChevronRight, Home, CheckCircle2, Activity, Trophy, TrendingUp, Sparkles, Award, Copy, Check, Clock, Smartphone, ArrowRight, Info, Coins, ArrowUpDown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { supabase, cloudFunctions } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getServiceLogo, getServiceLogoFallback, getCountryFlag, getFlagEmoji } from '@/lib/logo-service';
import { getSetting } from '@/lib/settings';
import { get5simProductName, get5simCountryName } from '@/lib/service-mapping';
import { RentOnboardingModal } from '@/components/ui/RentOnboardingModal';
import { computeServiceCountrySuccessRate, sortCountriesByReliability, getRealServiceCountryStats, getAnchorCompletedSms } from '@/lib/country-scoring';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    isPremium?: boolean;
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
    const [sortByPrice, setSortByPrice] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

    const [buying, setBuying] = useState(false);
    const [purchaseState, setPurchaseState] = useState<'idle' | 'loading' | 'smart_routing' | 'success'>('idle');
    const [purchasedNumber, setPurchasedNumber] = useState<string | null>(null);
    const [copiedNumber, setCopiedNumber] = useState(false);
    const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false);
    const [showOrderSteps, setShowOrderSteps] = useState(false);
    const [showReceptionSteps, setShowReceptionSteps] = useState(false);
    const [insufficientBalanceData, setInsufficientBalanceData] = useState<{ needed: number, available: number, missing: number } | null>(null);

    // --- Queries ---

    // 1. Services - MATCH DASHBOARD LOGIC
    const { data: services = [], isLoading: loadingServices } = useQuery({
        queryKey: ['available-services-sync', mode], // Unique key to avoid conflicts
        queryFn: async () => {
            // Fetch from DB
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('active', true);

            if (error) throw error;

            let filtered: any[] = data || [];

            // Hide 'ot'/'any' for activation/rent
            if (mode === 'activation' || mode === 'rent') {
                filtered = filtered.filter(s => s.code !== 'ot' && s.code !== 'any');
            }

            let servicesWithCounts = filtered.map((s: any) => ({
                id: s.code,
                name: s.display_name || s.name,
                code: s.code,
                count: s.total_available || 0,
                _priority: getServicePriority(s.code)
            }));

            // If rent mode, fetch real rent quantities
            if (mode === 'rent') {
                try {
                    const rentTimeMap: Record<string, string> = {
                        '4hours': '4', '1day': '24', '1week': '168', '1month': '720'
                    };
                    const { data: rentData } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
                        body: { time: rentTimeMap[rentDuration], getServices: true }
                    });
                    
                    const availableQuantities = new Map(
                        (rentData?.availableServices || []).map((s: any) => [s.code, s.available || 0])
                    );

                    servicesWithCounts = servicesWithCounts.map(s => ({
                        ...s,
                        count: availableQuantities.get(s.code) || 0
                    }));
                } catch (e) {
                    console.error('Failed to fetch rent services', e);
                }
            }

            // Sort by priority then availability (Dashboard Logic)
            return servicesWithCounts.sort((a, b) => {
                if (a.count > 0 && b.count === 0) return -1;
                if (a.count === 0 && b.count > 0) return 1;
                if (a._priority !== b._priority) return b._priority - a._priority;
                return b.count - a.count;
            });
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

            // 1. Fetch local DB stats first (Deep Analysis) & Real Activations Auto-Learning
            const { data: dbCountries } = await supabase
                .from('countries')
                .select('code, success_rate')
                .eq('active', true);

            const successRateMap = new Map(
                dbCountries?.map((c: any) => [c.code.toLowerCase(), c.success_rate]) || []
            );

            // 🧠 Auto-Apprentissage : Récupérer le vrai ratio de succès de la table activations
            const realStatsMap = await getRealServiceCountryStats(selectedService.code, supabase);

            // ✅ ACTIVATION MODE
            if (mode === 'activation') {

                // 2. Fetch API data
                const { data, error } = await cloudFunctions.invoke('get-top-countries-by-service', {
                    body: { service: selectedService.code }
                });

                if (error) throw error;

                const mapped = (data?.countries || [])
                    .filter((c: any) => c.count > 0 && c.price > 0)
                    .map((c: any) => {
                        const localRate = successRateMap.get(c.countryCode.toLowerCase());
                        const realStat = realStatsMap.get(c.countryCode?.toLowerCase()) ||
                                         realStatsMap.get(c.countryName?.toLowerCase()) ||
                                         realStatsMap.get(c.countryId?.toString());
                        const finalSuccessRate = computeServiceCountrySuccessRate(
                            c.countryCode,
                            c.countryName,
                            selectedService.code,
                            localRate,
                            c.successRate,
                            realStat
                        );

                        const isPremium = c.countryCode.toLowerCase() === 'us' ||
                            c.countryCode.toLowerCase() === 'gb' ||
                            (c.price > 30);

                        return {
                            id: c.countryId.toString(),
                            name: c.countryName,
                            code: c.countryCode,
                            flag: getFlagEmoji(c.countryCode) || '🌍',
                            flagUrl: getCountryFlag(c.countryCode),
                            isPremium: isPremium,
                            successRate: finalSuccessRate,
                            completedSms: realStat ? realStat.completed : getAnchorCompletedSms(selectedService.code, c.countryCode, c.countryName),
                            count: c.count,
                            price: Number(c.price.toFixed(2)),
                            operator: 'any',
                            _compositeScore: c.compositeScore
                        };
                    });

                return sortCountriesByReliability(mapped);
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

                const { data: rentData, error } = await cloudFunctions.invoke('get-sms-activate-rent-services', {
                    body: {
                        time: rentTime,
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
                    const dbRate = successRateMap.get(c.code.toLowerCase());
                    const realStat = realStatsMap.get(c.code?.toLowerCase()) ||
                                     realStatsMap.get(c.name?.toLowerCase()) ||
                                     realStatsMap.get(c.id?.toString());
                    const rate = computeServiceCountrySuccessRate(c.code, c.name, selectedService.code, dbRate, null, realStat);

                    return {
                        id: `rent-${c.id}`,
                        name: c.name,
                        code: c.code,
                        flag: getFlagEmoji(c.code) || '🌍',
                        flagUrl: getCountryFlag(c.code),
                        isPremium: false,
                        successRate: rate,
                        count: c.quantity || 0,
                        price: sellingPrice,
                        operator: 'any'
                    };
                });

                return sortCountriesByReliability(availableCountries);
            }
        },
        enabled: !!selectedService && currentStep === 'country'
    });

    // Filter and optionally sort countries by price
    const filteredCountries = ((countries as Country[]) || [])
        .filter((c: Country) => c.name?.toLowerCase().includes(searchCountry.toLowerCase()))
        .sort((a: Country, b: Country) => {
            if (!sortByPrice) return 0; // Conserver le tri par Réussite SMS par défaut
            return (a.price || 0) - (b.price || 0);
        });


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

                        let reasonMsg = "Optimisation de la route... ⚡";
                        // if (prediction.reasoning?.includes('Avoid') || prediction.veto) {
                        //     reasonMsg += " (Échec précédent évité 🛡️)";
                        // } else if (prediction.reasoning?.includes('Global')) {
                        //     reasonMsg += " (Meilleur choix global 🏆)";
                        // }

                        // HIDE PROVIDER NAMES FROM USER UI
                        // But keep logging for debugging


                        toast({
                            title: "Smart Routing Actif",
                            description: "Sélection intelligente du réseau le plus performant en cours",
                            variant: "smart" as any,
                            duration: 3500
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

            let functionName = 'buy-number-intelligent';
            let requestBody: any = {};

            if (isRent) {
                // RENTAL: Use HeroSMS (SMS-Activate)
                functionName = 'buy-sms-activate-rent';

                // Convert duration label to hours
                const rentTimeMap: Record<string, string> = {
                    '4hours': '4',
                    '1day': '24',
                    '1week': '168',
                    '1month': '720'
                };

                requestBody = {
                    country: countryId,
                    product: productCode,
                    userId: user.id,
                    duration: rentDuration, // Pass the original string label, backend maps it or handles it
                    expectedPrice: finalPrice
                };
            } else {
                // ACTIVATION: Check Provider
                // 🧠 ADAPTIVE OVERRIDE (Takes precedence if set)
                let targetProvider = adaptiveProvider || providerMode;

                // 🔧 SMART FALLBACK: TextVerified is US-ONLY
                // If TextVerified is selected but country is NOT USA, fallback to sms-activate
                const isUSA = ['usa', '12', 'united states', 'us'].includes(countryId.toLowerCase()) ||
                    selectedCountry.name.toLowerCase().includes('united states') ||
                    selectedCountry.name.toLowerCase() === 'usa';

                if (targetProvider === 'textverified' && !isUSA) {
                    console.log('⚠️ [BuyNumberPage] TextVerified is US-only, falling back to sms-activate for:', countryId);
                    targetProvider = 'sms-activate';
                    toast({
                        title: "Routage Optimisé",
                        description: `Basculement automatique sur la ligne optimale pour ${selectedCountry.name}`,
                        variant: "smart" as any,
                        duration: 3500
                    });
                }

                if (targetProvider === '5sim') {
                    requestBody.providerOverride = '5sim';

                    // Convert Country and Product for 5sim
                    const country5sim = get5simCountryName(selectedCountry.name);
                    const product5sim = get5simProductName(productCode);

                    requestBody = {
                        country: country5sim,
                        operator: 'any',
                        product: product5sim,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'smspva') {
                    // 🟢 USE SMSPVA
                    requestBody.providerOverride = 'smspva';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'onlinesim') {
                    // 🟠 USE ONLINESIM
                    requestBody.providerOverride = 'onlinesim';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'grizzly') {
                    // 🐻 USE GRIZZLY SMS
                    requestBody.providerOverride = 'grizzly';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        service: productCode,  // Grizzly uses 'service' param
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'textverified') {
                    // 💎 USE TEXTVERIFIED (Premium/Reliable)
                    requestBody.providerOverride = 'textverified';
                    requestBody = {
                        country: countryId,
                        product: productCode,
                        service: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'smspool') {
                    // 🌊 USE SMSPOOL (Premium Global)
                    functionName = 'buy-number-intelligent';
          requestBody.providerOverride = 'smspool';
                    requestBody = {
                        country: countryId,
                        product: productCode,
                        service: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else if (targetProvider === 'intelligent' || targetProvider === 'smart') {
                    // 🧠 INTELLIGENT MODE (Default Start): Try HeroSMS first
                    requestBody.providerOverride = 'sms-activate';
                    requestBody = {
                        country: countryId,
                        operator: 'any',
                        product: productCode,
                        userId: user.id,
                        expectedPrice: finalPrice
                    };
                } else {
                    // Default / fallback / sms-activate
                    functionName = 'buy-number-intelligent';
          requestBody.providerOverride = 'sms-activate';
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
            setPurchaseState('loading');

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
                    errorMessage.toLowerCase().includes('not available') ||
                    errorMessage.toLowerCase().includes('couldn\'t find') ||  // SMSPool: "couldn't find an available phone number"
                    errorMessage.toLowerCase().includes('no numbers available') ||  // SMSPool: "No numbers available"
                    errorMessage.toLowerCase().includes('out_of_stock') ||  // SMSPool: OUT_OF_STOCK
                    errorMessage.includes('SMSPool Error') ||
                    errorMessage.includes('Connection Error') || // Matches "SMSPool Connection Error"
                    errorMessage.includes('Unexpected end of JSON input') || // Matches upstream API temporary failures
                    errorMessage.includes('not found') ||
                    errorMessage.includes('Price not found') ||
                    errorMessage.toLowerCase().includes('no product'); // 5sim: "no product"

                if (isSmartMode && isNoNumbers) {
                    console.log('🧠 [FALLBACK START]', {
                        provider: functionName,
                        adaptiveVeto,
                        isNoNumbers
                    });

                    // Helper to try a provider and throw if fails
                    const tryProvider = async (providerName: string, funcName: string, body: any) => {
                        body.providerOverride = providerName.toLowerCase().replace(/\s|-/g, '');
                        if (providerName === 'SMS-Activate') body.providerOverride = 'sms-activate';
                        if (providerName === 'Grizzly SMS') body.providerOverride = 'grizzlysms';
                        console.log(`🧠 Smart mode: Trying ${providerName}...`);
                        // Hide provider name from UI
                        setPurchaseState('smart_routing');

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

                    // 1. Try 5sim (Backup 1 - High Volume & Cheap)
                    console.log('check 5sim', { successData: !!successData, isCurrent: functionName === 'buy-5sim-number', veto: adaptiveVeto === '5sim' });
                    if (!successData && functionName !== 'buy-5sim-number' && adaptiveVeto !== '5sim') {
                        try {
                            const body = {
                                country: get5simCountryName(selectedCountry.name),
                                operator: 'any',
                                product: get5simProductName(productCode),
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('5sim', 'buy-number-intelligent', body);
                            console.log('✅ 5sim fallback succeeded');
                        } catch (e) {
                            console.warn('⚠️ 5sim fallback failed:', e);
                        }
                    }

                    // 2. Try SMS-Activate (Backup 2 - Huge Inventory)
                    console.log('check activ', { successData: !!successData, isCurrent: functionName === 'buy-number-intelligent' });
                    if (!successData && functionName !== 'buy-number-intelligent') {
                        try {
                            const body = {
                                country: countryId, // SMS-Activate ID
                                operator: 'any',
                                product: productCode,
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('SMS-Activate', 'buy-number-intelligent', body);
                            console.log('✅ SMS-Activate fallback succeeded');
                        } catch (e) {
                            console.warn('⚠️ SMS-Activate fallback failed:', e);
                        }
                    }

                    // 3. Try Grizzly SMS (Backup 3 - Reliable)
                    console.log('check grizz', { successData: !!successData, isCurrent: functionName === 'buy-grizzly-number' });
                    if (!successData && functionName !== 'buy-grizzly-number') {
                        try {
                            const body = {
                                country: countryId, // Needs ISO or ID? Grizzly func handles mapping usually
                                operator: 'any',
                                product: productCode,
                                service: productCode,
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('Grizzly SMS', 'buy-number-intelligent', body);
                            console.log('✅ Grizzly fallback succeeded');
                        } catch (e) {
                            console.warn('⚠️ Grizzly fallback failed:', e);
                        }
                    }

                    // 4. Try OnlineSIM (Backup 4)
                    if (!successData && functionName !== 'buy-onlinesim-number') {
                        try {
                            const body = {
                                country: countryId,
                                operator: 'any',
                                product: productCode,
                                userId: user?.id,
                                expectedPrice: finalPrice
                            };
                            successData = await tryProvider('OnlineSIM', 'buy-number-intelligent', body);
                            console.log('✅ OnlineSIM fallback succeeded');
                        } catch (e) {
                            console.warn('⚠️ OnlineSIM fallback failed:', e);
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
                } else if (functionName.includes('grizzly')) {
                    usedProvider = 'grizzly';
                } else if (functionName.includes('textverified')) {
                    usedProvider = 'textverified';
                } else if (functionName.includes('smspool')) {
                    usedProvider = 'smspool';
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
                } else if (usedProvider === 'grizzly') {
                    statusCheckerFunction = 'check-grizzly-status';
                } else if (usedProvider === 'textverified') {
                    statusCheckerFunction = 'check-textverified-status';
                } else if (usedProvider === 'smspool') {
                    statusCheckerFunction = 'check-smspool-status';
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

            setPurchasedNumber(buyData.data.phone || 'Nouveau Numéro');
            setPurchaseState('success');

            // Redirect to Dashboard after a 12s delay to allow copying number & reading instructions
            setTimeout(() => {
                navigate('/dashboard');
                setPurchaseState('idle');
                setBuying(false);
            }, 12000);

            // Don't setBuying(false) yet to keep the UI in success state
            return;

        } catch (err: any) {
            setPurchaseState('idle');
            toast({
                title: t('common.error'),
                description: err.message || t('toasts.orderError'),
                variant: 'destructive'
            });
            if (purchaseState !== 'success') {
                setBuying(false);
                setPurchaseState('idle');
            }
        }
    };



    // Animations
    const stepVariants: any = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
        exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: 'easeIn' } }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans overflow-x-hidden">
            <RentOnboardingModal />
            <div className="p-4 max-w-lg mx-auto space-y-4">
                <AnimatePresence mode="wait">
                {currentStep === 'service' && (
                    <motion.div
                        key="step-service"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Mode Toggle - Magic UI / 21st style segment control with Logo Colors */}
                        <div className="relative flex bg-gray-100/80 backdrop-blur-sm rounded-[20px] p-1.5 mb-6 shadow-inner border border-gray-200/50">
                            {/* Sliding Pill Background */}
                            <div 
                                className={`absolute inset-y-1.5 left-1.5 rounded-[16px] shadow-md transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) ${
                                    mode === 'activation' 
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/30' 
                                        : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-cyan-500/30'
                                }`}
                                style={{
                                    width: 'calc(50% - 6px)',
                                    transform: mode === 'activation' ? 'translateX(0)' : 'translateX(100%)',
                                }}
                            />
                            <button
                                onClick={() => setMode('activation')}
                                className={`relative z-10 flex-1 py-3 text-[15px] font-extrabold tracking-wide rounded-[16px] transition-colors duration-300 ${mode === 'activation'
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                {t('common.activation')}
                            </button>
                            <button
                                onClick={() => setMode('rent')}
                                className={`relative z-10 flex-1 py-3 text-[15px] font-extrabold tracking-wide rounded-[16px] transition-colors duration-300 ${mode === 'rent'
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                {/* Nouveau Badge */}
                                <span className="absolute -top-2 right-2 sm:right-6 md:right-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 border border-white/20 animate-bounce">
                                    Nouveau
                                </span>
                                {t('common.rent')}
                            </button>
                        </div>

                        <div className="relative mb-5">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher un service (ex: WhatsApp, Telegram, Google...)"
                                className="pl-10 h-12 bg-white rounded-xl border-gray-200 shadow-2xs focus:border-[#00A3FF] transition-all text-sm"
                                value={searchService}
                                onChange={(e) => setSearchService(e.target.value)}
                            />
                        </div>

                        {loadingServices ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-2 text-[#0055FF]" />
                                <p className="text-sm">Chargement des services...</p>
                            </div>
                        ) : (
                            <>
                                {/* Special Service for Rent Mode - Location complète */}
                                {mode === 'rent' && (
                                    <div className="mb-6 relative">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <div className="w-2 h-2 rounded-full bg-[#0055FF] shadow-[0_0_8px_rgba(0,85,255,0.8)] animate-pulse" />
                                            <p className="text-[11px] text-[#0055FF] uppercase tracking-widest font-extrabold">
                                                Exclusivité
                                            </p>
                                        </div>
                                        
                                        {/* Location complète - Full Blue Premium */}
                                        <div
                                            onClick={() => handleServiceSelect({ id: 'full', name: 'Location complète', code: 'full', count: 999 })}
                                            className="relative group cursor-pointer overflow-hidden rounded-[1.2rem] shadow-lg hover:shadow-[0_8px_30px_rgba(0,85,255,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                                        >
                                            {/* Full Blue Background Gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#0055FF] via-blue-600 to-[#00A3FF]" />
                                            
                                            {/* Inner Glow / Highlights */}
                                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
                                            <div className="absolute -inset-[1.5px] bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 rounded-[1.2rem] opacity-0 group-hover:opacity-40 blur-sm transition-opacity duration-500" />
                                            
                                            {/* Shimmer sweep effect */}
                                            <div className="absolute inset-0 overflow-hidden rounded-2xl z-10 pointer-events-none">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                            </div>

                                            {/* Card Content */}
                                            <div className="relative z-20 p-4 flex items-center gap-4">
                                                
                                                {/* Premium Icon Container - White Glassmorphism */}
                                                <div className="relative w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-white/30 transition-colors">
                                                    <Home className="w-7 h-7 text-white drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-extrabold text-lg text-white drop-shadow-sm">
                                                        Location Complète
                                                    </p>
                                                    <p className="text-sm font-medium text-blue-50/90 drop-shadow-sm">
                                                        Recevoir les SMS de <strong>tous les services</strong>
                                                    </p>
                                                </div>
                                                
                                                {/* Chevron */}
                                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#0055FF] group-hover:translate-x-1 transition-all duration-300 shadow-sm">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-2.5 pb-24">
                                    {filteredServices.map((service: any) => (
                                        <div
                                            key={service.id}
                                            onClick={() => {
                                                if (service.count > 0) handleServiceSelect(service);
                                            }}
                                            className={`bg-white p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${service.count > 0 ? 'border-gray-200/80 shadow-2xs cursor-pointer hover:border-[#00A3FF] hover:shadow-sm active:scale-[0.99]' : 'border-gray-100 opacity-50 grayscale cursor-not-allowed'}`}
                                        >
                                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center p-2 shadow-2xs border border-gray-200/60 group-hover:bg-[#00A3FF]/10 transition-colors flex-shrink-0">
                                                    <img
                                                        src={getServiceLogo(service.code)}
                                                        className="w-6 h-6 object-contain"
                                                        loading="lazy"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`font-bold text-sm tracking-tight text-gray-900 truncate transition-colors ${service.count > 0 ? 'group-hover:text-[#0055FF]' : ''}`}>{service.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${service.count > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                            {service.count > 0 ? `${service.count.toLocaleString()} disponibles` : 'Rupture de stock'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#0055FF] group-hover:text-white transition-all flex-shrink-0">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {currentStep === 'country' && selectedService && (
                    <motion.div
                        key="step-country"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-blue-100">
                                <img
                                    src={getServiceLogo(selectedService.code)}
                                    className="w-6 h-6 object-contain"
                                    loading="lazy"
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
                                {/* BANDEAU TOP PAYS PAR RÉUSSITE SMS */}
                                {/* BANDEAU TOP PAYS AUDITÉ PAR SERVICE */}
                                {/* BANDEAU CLASSEMENT PAR RÉUSSITE SMS */}
                                <div className="px-3.5 py-2.5 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0055FF] to-[#00A3FF] flex items-center justify-center text-white shadow-xs flex-shrink-0">
                                            <Trophy className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-gray-900 tracking-wide uppercase">
                                                {sortByPrice ? 'Tri par Prix Ⓐ' : 'Classement Réussite'}
                                            </h4>
                                            <p className="text-[10px] text-gray-500">
                                                Optimisé pour <span className="font-bold text-gray-900">{selectedService?.name}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* MICRO TOGGLE COMPACT (21st.dev style - Couleur ONE SMS) */}
                                    <div className="inline-flex items-center h-7 p-0.5 bg-gray-100/90 rounded-lg border border-gray-200/60 text-[11px] font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setSortByPrice(false)}
                                            className={`px-2.5 h-6 rounded-md transition-all duration-150 flex items-center gap-1 ${!sortByPrice ? 'bg-[#0055FF] text-white font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            <Trophy className="w-3 h-3" />
                                            <span>Réussite</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSortByPrice(true)}
                                            className={`px-2.5 h-6 rounded-md transition-all duration-150 flex items-center gap-1 ${sortByPrice ? 'bg-[#0055FF] text-white font-bold shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            <Coins className="w-3 h-3" />
                                            <span>Prix Ⓐ</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 🔙 BACK CARD */}
                                <div
                                    onClick={() => handleBack()}
                                    className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-3.5 cursor-pointer transition-all group hover:border-[#00A3FF] hover:shadow-sm active:scale-[0.99]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-[#00A3FF]/10 group-hover:text-[#0055FF] transition-colors">
                                        <ChevronLeft className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-sm">Changer de service</h3>
                                        <p className="text-xs text-gray-500">Retour à la liste des services</p>
                                    </div>
                                </div>

                                {filteredCountries.map((country, idx) => {
                                    const hasStock = country.count > 0;
                                    const rankPos = (country as any).rank || (idx + 1);
                                    const isTop1 = rankPos === 1 && hasStock;
                                    const isTop3 = rankPos <= 3 && hasStock;

                                    return (
                                        <div
                                            key={country.id}
                                            onClick={() => {
                                                if (hasStock) handleCountrySelect(country);
                                            }}
                                            className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${hasStock
                                                ? isTop1
                                                    ? 'bg-gradient-to-r from-[#00A3FF]/5 via-white to-white border-[#00A3FF]/40 shadow-2xs cursor-pointer hover:border-[#0055FF] hover:shadow-sm active:scale-[0.99]'
                                                    : 'bg-white border-gray-200/80 shadow-2xs cursor-pointer hover:border-gray-300 hover:shadow-sm active:scale-[0.99]'
                                                : 'bg-gray-50/60 border-gray-100 opacity-50 grayscale cursor-not-allowed'}`}
                                        >
                                            {/* Rank Indicator */}
                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${isTop1
                                                ? 'bg-[#0055FF] text-white shadow-2xs'
                                                : isTop3
                                                    ? 'bg-gray-900 text-white'
                                                    : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                #{rankPos}
                                            </div>

                                            {/* Country Flag Container */}
                                            <div className="w-11 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200/80 shadow-2xs flex-shrink-0">
                                                <img
                                                    src={country.flagUrl || getCountryFlag(country.code)}
                                                    alt={country.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={`font-bold text-sm tracking-tight text-gray-900 ${hasStock ? 'group-hover:text-[#0055FF] transition-colors' : ''}`}>
                                                        {country.name}
                                                    </h3>
                                                    {isTop1 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20 text-[#0055FF] text-[10px] font-black uppercase tracking-wider">
                                                            <Award className="w-3 h-3 text-[#0055FF]" />
                                                            1er Rang
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {hasStock ? `${country.count.toLocaleString()} disponibles` : <span className="text-red-600 font-semibold">Rupture de stock</span>}
                                                    </span>
                                                    {hasStock && (
                                                        country.successRate !== null && country.successRate !== undefined ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                                                {country.successRate}% Réussite
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                                --% Réussite
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <div className={`px-3.5 py-2 rounded-xl font-bold transition-all ${country.count > 0 ? 'bg-gradient-to-r from-[#0055FF] to-[#00A3FF] text-white shadow-sm shadow-[#00A3FF]/25 group-hover:from-[#0044CC] group-hover:to-[#0088CC] group-hover:shadow-md' : 'bg-gray-100 border border-gray-200 text-gray-400'}`}>
                                                    <span className="text-sm font-black tracking-tight">{country.price}</span>
                                                    <span className="text-xs ml-0.5 font-normal opacity-90">Ⓐ</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {currentStep === 'confirm' && selectedService && selectedCountry && (
                    <motion.div 
                        key="step-confirm"
                        variants={{
                            hidden: { opacity: 0, scale: 0.95, y: 20 },
                            visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
                            exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="pt-4"
                    >
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 text-center space-y-8 relative overflow-hidden">
                            {purchaseState !== 'idle' ? (
                                <div className="py-6 flex flex-col items-center justify-center min-h-[350px]">
                                    <AnimatePresence mode="wait">
                                        {purchaseState === 'loading' && (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="flex flex-col items-center space-y-6"
                                            >
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center border border-blue-200 shadow-inner relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Attribution de votre numéro...</h3>
                                                    <p className="text-sm text-gray-500 mt-2 font-medium">Connexion sécurisée aux serveurs pour {selectedService.name}</p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {purchaseState === 'smart_routing' && (
                                            <motion.div
                                                key="smart_routing"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="flex flex-col items-center space-y-6"
                                            >
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-purple-50 to-purple-100/50 flex items-center justify-center border border-purple-200 shadow-inner relative overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                                        <Activity className="w-12 h-12 text-purple-600 animate-bounce" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Algorithme de Routage</h3>
                                                    <p className="text-sm text-gray-500 mt-2 font-medium">Sélection de la ligne avec le meilleur taux de réception...</p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {purchaseState === 'success' && (
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1, transition: { type: 'spring', damping: 22 } }}
                                                className="flex flex-col items-center w-full max-w-lg mx-auto text-left"
                                            >
                                                {/* Header success compact */}
                                                <div className="w-full text-center mb-4">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                        Ligne Active & Prête
                                                    </div>
                                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                                        Votre Numéro {selectedService.name} est prêt !
                                                    </h3>
                                                    <p className="text-gray-500 text-xs font-medium mt-1">
                                                        Copiez le numéro ci-dessous et collez-le dans l'application pour recevoir votre SMS.
                                                    </p>
                                                </div>

                                                {/* Phone Number Display Card Compacte */}
                                                <div className="bg-gradient-to-br from-blue-50/90 via-white to-blue-50/50 border-2 border-[#0055FF]/25 rounded-2xl p-4 sm:p-5 w-full shadow-md shadow-[#0055FF]/5 relative overflow-hidden mb-3">
                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                        <div className="text-center sm:text-left">
                                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-0.5">
                                                                Numéro attribué ({selectedCountry.name})
                                                            </span>
                                                            <span className="text-2xl sm:text-3xl font-black text-[#0055FF] tracking-tight font-mono select-all">
                                                                {purchasedNumber}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            onClick={() => {
                                                                if (purchasedNumber) {
                                                                    navigator.clipboard.writeText(purchasedNumber);
                                                                    setCopiedNumber(true);
                                                                    setTimeout(() => setCopiedNumber(false), 2500);
                                                                }
                                                            }}
                                                            className={`h-11 px-5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${copiedNumber ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#0055FF] hover:bg-[#0044CC] text-white'}`}
                                                        >
                                                            {copiedNumber ? (
                                                                <>
                                                                    <Check className="w-4 h-4" />
                                                                    <span>Copié !</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="w-4 h-4" />
                                                                    <span>Copier</span>
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Déroulement de la réception Accordéon Compact */}
                                                <div className="w-full bg-gray-50/90 rounded-xl border border-gray-200/60 overflow-hidden mb-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowReceptionSteps(!showReceptionSteps)}
                                                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-gray-100/60 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Info className="w-4 h-4 text-[#0055FF]" />
                                                            <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
                                                                Déroulement de la réception
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-[#0055FF]">
                                                            {showReceptionSteps ? 'Masquer ▲' : 'Voir les étapes ▼'}
                                                        </span>
                                                    </button>
                                                    <AnimatePresence>
                                                        {showReceptionSteps && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="px-3.5 pb-3 border-t border-gray-200/50 space-y-2.5 text-xs text-left pt-2.5"
                                                            >
                                                                {/* Step 1 */}
                                                                <div className="flex items-start gap-2.5">
                                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✓</span>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">Numéro attribué avec succès</p>
                                                                        <p className="text-gray-500 text-[11px]">Prêt à intercepter le SMS de {selectedService.name}.</p>
                                                                    </div>
                                                                </div>
                                                                {/* Step 2 */}
                                                                <div className="flex items-start gap-2.5">
                                                                    <span className="w-5 h-5 rounded-full bg-[#0055FF] text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">2</span>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">Entrez ce numéro sur {selectedService.name}</p>
                                                                        <p className="text-gray-500 text-[11px]">Collez le numéro et demandez l'envoi du code par SMS.</p>
                                                                    </div>
                                                                </div>
                                                                {/* Step 3 */}
                                                                <div className="flex items-start gap-2.5">
                                                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0055FF] flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">⏳</span>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">Le code s'affichera en direct (15 à 60s)</p>
                                                                        <p className="text-gray-500 text-[11px]">Consultez votre SMS instantanément depuis votre tableau de bord.</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Guarantee Ligne Fine */}
                                                <div className="w-full flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/70 px-3 py-2 rounded-xl text-left mb-4">
                                                    <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                    <p className="text-[11px] text-emerald-800 font-medium">
                                                        <span className="font-bold">Garantie Zéro Risque :</span> Remboursé 100% si aucun SMS reçu en 5 min.
                                                    </p>
                                                </div>

                                                {/* Actions Compactes */}
                                                <div className="w-full flex flex-col sm:flex-row gap-2.5">
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            navigate('/dashboard');
                                                            setPurchaseState('idle');
                                                            setBuying(false);
                                                        }}
                                                        className="flex-1 h-12 text-sm font-extrabold rounded-xl shadow-lg shadow-[#0055FF]/20 bg-gradient-to-r from-[#0055FF] to-[#00A3FF] hover:from-[#0044CC] hover:to-[#0088CC] text-white border-0 flex items-center justify-center gap-2"
                                                    >
                                                        <span>📥 Aller voir mon SMS en direct</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setPurchaseState('idle');
                                                            setPurchasedNumber(null);
                                                            setBuying(false);
                                                        }}
                                                        className="h-12 px-5 text-xs font-extrabold rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700"
                                                    >
                                                        + Autre numéro
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <>
                                    {/* Header Compact et Moderne */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0055FF]/10 via-blue-50 to-[#00A3FF]/15 border border-[#0055FF]/20 p-2 shadow-sm flex items-center justify-center">
                                                    <img
                                                        src={getServiceLogo(selectedService.code)}
                                                        onError={(e) => {
                                                            const target = e.currentTarget;
                                                            if (target.dataset.fallbackLoaded === 'true') return;
                                                            target.dataset.fallbackLoaded = 'true';
                                                            target.src = getServiceLogoFallback(selectedService.code);
                                                        }}
                                                        alt={selectedService.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-2xs flex items-center justify-center bg-white">
                                                    <img
                                                        src={selectedCountry.flagUrl || getCountryFlag(selectedCountry.code)}
                                                        alt={selectedCountry.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                                                    {t('buyNumber.confirmOrder', 'Confirmer la commande')}
                                                </h2>
                                                <p className="text-xs text-gray-500 font-semibold">
                                                    {selectedService.name} ({selectedCountry.name})
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0055FF] text-[11px] font-black uppercase">
                                            Prêt
                                        </span>
                                    </div>

                                    {/* Summary Card Compacte */}
                                    <div className="bg-gray-50/80 rounded-xl border border-gray-200/60 p-3.5 space-y-2.5 text-left mb-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-semibold uppercase">{t('buyNumber.service', 'Service')}</span>
                                            <span className="font-extrabold text-gray-900">{selectedService.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-semibold uppercase">{t('buyNumber.country', 'Pays')}</span>
                                            <span className="font-extrabold text-gray-900">{selectedCountry.name}</span>
                                        </div>

                                        {mode === 'rent' && (
                                            <div className="pt-2 border-t border-gray-200/60">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-gray-500 text-xs font-semibold uppercase">Durée</span>
                                                </div>
                                                <div className="bg-white p-1 rounded-lg flex gap-1 border border-gray-200/60">
                                                    {[
                                                        { v: '4hours', l: '4H' }, { v: '1day', l: '1 Jour' },
                                                        { v: '1week', l: '1 Sem' }, { v: '1month', l: '1 Mois' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.v}
                                                            onClick={() => setRentDuration(opt.v as any)}
                                                            className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${rentDuration === opt.v ? 'bg-[#0055FF] text-white shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                                                        >
                                                            {opt.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-gray-200/80 flex justify-between items-center">
                                            <span className="text-gray-700 text-xs font-black uppercase tracking-wider">{t('buyNumber.totalPrice', 'Prix Total')}</span>
                                            <span className="font-black text-xl text-[#0055FF]">
                                                {mode === 'rent'
                                                    ? Math.ceil(selectedCountry.price * (rentDuration === '4hours' ? 1 : rentDuration === '1day' ? 3 : rentDuration === '1week' ? 15 : 50))
                                                    : Math.ceil(selectedCountry.price)
                                                } 
                                                <span className="text-xs font-bold text-[#00A3FF] ml-1">Ⓐ</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Déroulement de la commande - Cliquable pour afficher (Accordéon) */}
                                    <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl overflow-hidden text-left mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowOrderSteps(!showOrderSteps)}
                                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[#0055FF] hover:bg-blue-100/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5" />
                                                <span>Comment ça marche ? (Déroulement)</span>
                                            </div>
                                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-[#0055FF] border border-blue-200/60">
                                                {showOrderSteps ? 'Masquer ▲' : 'Voir les étapes ▼'}
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {showOrderSteps && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="px-3.5 pb-3 border-t border-blue-100 space-y-1.5 text-xs text-gray-700 pt-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full bg-[#0055FF] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                                        <span>Attribution instantanée du numéro de téléphone</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full bg-[#0055FF] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                                        <span>Collez le numéro dans votre application {selectedService.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full bg-[#0055FF] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                                                        <span>Recevez le code SMS en direct ici et sur le Dashboard</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Guarantee Ligne Compacte */}
                                    <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/70 px-3.5 py-2.5 rounded-xl text-left mb-4">
                                        <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <p className="text-[11px] text-emerald-800 font-medium">
                                            <span className="font-bold">Garantie Zéro Risque :</span> Remboursé 100% si aucun SMS reçu en 5 min.
                                        </p>
                                    </div>

                                    {/* Actions Compactes */}
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="px-4 h-12 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                                            disabled={buying}
                                        >
                                            {t('buyNumber.cancel', 'Annuler')}
                                        </button>

                                        <Button
                                            className="flex-1 h-12 text-sm font-extrabold rounded-xl shadow-lg shadow-[#0055FF]/20 bg-[#0055FF] hover:bg-[#0044CC] text-white border-0"
                                            onClick={handleBuy}
                                            disabled={buying}
                                        >
                                            {buying ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                                                    <span className="text-white">{t('buyNumber.purchasing', 'Achat en cours...')}</span>
                                                </>
                                            ) : (
                                                <span className="text-white">
                                                    Confirmer l&apos;achat ({mode === 'rent'
                                                        ? Math.ceil(selectedCountry.price * (rentDuration === '4hours' ? 1 : rentDuration === '1day' ? 3 : rentDuration === '1week' ? 15 : 50))
                                                        : Math.ceil(selectedCountry.price)} Ⓐ)
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
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
