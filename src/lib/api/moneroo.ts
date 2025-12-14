/**
 * Moneroo Payment API Client
 * Documentation: https://docs.moneroo.io
 * 
 * Moneroo permet d'accéder à plusieurs fournisseurs de paiement
 * principalement en Afrique avec une seule intégration.
 */

import { supabase, cloudFunctions } from '@/lib/supabase';

// Types
export interface MonerooCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface MonerooPaymentRequest {
  amount: number;
  currency: 'XOF' | 'XAF' | 'NGN' | 'GHS' | 'KES' | 'USD' | 'EUR';
  description: string;
  customer: MonerooCustomer;
  return_url: string;
  metadata?: Record<string, string>;
  methods?: string[]; // e.g., ['mtn_bj', 'moov_bj', 'wave_sn']
}

export interface MonerooPaymentResponse {
  message: string;
  data: {
    id: string;
    checkout_url: string;
  };
  errors?: any;
}

export interface MonerooTransactionStatus {
  id: string;
  status: 'success' | 'pending' | 'failed';
  is_processed: boolean;
  processed_at: string | null;
  amount: number;
  amount_formatted: string;
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  description: string;
  return_url: string;
  environment: 'sandbox' | 'live';
  initiated_at: string;
  metadata: Record<string, string>;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  capture?: {
    method: {
      id: string;
      name: string;
      short_code: string;
      icon_url: string;
    };
    gateway: {
      name: string;
      transaction_id: string;
      transaction_status: string;
    };
  };
  created_at: string;
}

export interface MonerooVerifyResponse {
  message: string;
  data: MonerooTransactionStatus;
  errors?: any;
}

// Méthodes de paiement disponibles par pays
export const MONEROO_PAYMENT_METHODS = {
  // Bénin
  benin: ['mtn_bj', 'moov_bj'],
  // Sénégal
  senegal: ['orange_money_sn', 'wave_sn', 'free_money_sn'],
  // Côte d'Ivoire
  cote_ivoire: ['mtn_ci', 'moov_ci', 'orange_money_ci', 'wave_ci'],
  // Nigeria
  nigeria: ['bank_transfer_ngn', 'qr_ngn', 'card_ngn'],
  // Ghana
  ghana: ['mtn_gh', 'vodafone_gh', 'airtel_tigo_gh'],
  // Kenya
  kenya: ['mpesa_ke'],
  // Cameroun
  cameroon: ['mtn_cm', 'orange_money_cm'],
  // Togo
  togo: ['moov_tg', 'tmoney_tg'],
  // Burkina Faso
  burkina_faso: ['orange_money_bf', 'moov_bf'],
  // Mali
  mali: ['orange_money_ml', 'moov_ml'],
};

// Toutes les méthodes supportées (pour affichage)
export const ALL_MONEROO_METHODS = [
  // Mobile Money - West Africa
  { code: 'mtn_bj', name: 'MTN MoMo Bénin', icon: '🇧🇯', currency: 'XOF' },
  { code: 'moov_bj', name: 'Moov Money Bénin', icon: '🇧🇯', currency: 'XOF' },
  { code: 'orange_money_sn', name: 'Orange Money Sénégal', icon: '🇸🇳', currency: 'XOF' },
  { code: 'wave_sn', name: 'Wave Sénégal', icon: '🇸🇳', currency: 'XOF' },
  { code: 'free_money_sn', name: 'Free Money Sénégal', icon: '🇸🇳', currency: 'XOF' },
  { code: 'mtn_ci', name: 'MTN MoMo Côte d\'Ivoire', icon: '🇨🇮', currency: 'XOF' },
  { code: 'moov_ci', name: 'Moov Money Côte d\'Ivoire', icon: '🇨🇮', currency: 'XOF' },
  { code: 'orange_money_ci', name: 'Orange Money Côte d\'Ivoire', icon: '🇨🇮', currency: 'XOF' },
  { code: 'wave_ci', name: 'Wave Côte d\'Ivoire', icon: '🇨🇮', currency: 'XOF' },
  // Nigeria
  { code: 'bank_transfer_ngn', name: 'Bank Transfer Nigeria', icon: '🇳🇬', currency: 'NGN' },
  { code: 'card_ngn', name: 'Card Payment Nigeria', icon: '🇳🇬', currency: 'NGN' },
  // Ghana
  { code: 'mtn_gh', name: 'MTN MoMo Ghana', icon: '🇬🇭', currency: 'GHS' },
  { code: 'vodafone_gh', name: 'Vodafone Cash Ghana', icon: '🇬🇭', currency: 'GHS' },
  // Kenya
  { code: 'mpesa_ke', name: 'M-Pesa Kenya', icon: '🇰🇪', currency: 'KES' },
  // Cameroun
  { code: 'mtn_cm', name: 'MTN MoMo Cameroun', icon: '🇨🇲', currency: 'XAF' },
  { code: 'orange_money_cm', name: 'Orange Money Cameroun', icon: '🇨🇲', currency: 'XAF' },
];

/**
 * Initialiser un paiement via Moneroo
 * Appelle l'Edge Function qui gère l'appel API sécurisé
 */
export const initializePayment = async (
  payment: MonerooPaymentRequest
): Promise<MonerooPaymentResponse> => {
  const { data, error } = await cloudFunctions.invoke('init-moneroo-payment', {
    body: payment
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de l\'initialisation du paiement');
  }

  if (!data?.data?.checkout_url) {
    throw new Error(data?.message || 'Aucune URL de paiement reçue');
  }

  return data;
};

/**
 * Vérifier le statut d'un paiement
 */
export const verifyPayment = async (
  paymentId: string
): Promise<MonerooVerifyResponse> => {
  const { data, error } = await cloudFunctions.invoke('verify-moneroo-payment', {
    body: { paymentId }
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de la vérification du paiement');
  }

  return data;
};

/**
 * Obtenir les méthodes de paiement disponibles
 */
export const getAvailableMethods = async (): Promise<any[]> => {
  try {
    const response = await fetch('https://api.moneroo.io/utils/payment/methods', {
      headers: {
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erreur récupération méthodes Moneroo:', error);
    return ALL_MONEROO_METHODS;
  }
};

// Export default pour compatibilité
const moneroo = {
  initializePayment,
  verifyPayment,
  getAvailableMethods,
  PAYMENT_METHODS: MONEROO_PAYMENT_METHODS,
  ALL_METHODS: ALL_MONEROO_METHODS
};

export default moneroo;
