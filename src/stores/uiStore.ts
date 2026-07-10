import { create } from 'zustand'

interface ActivationData {
  id?: string;
  service_code?: string;
  sms_code?: string | null;
  phone?: string;
}

interface UIStore {
    mobileMenuOpen: boolean
    setMobileMenuOpen: (open: boolean) => void
    toggleMobileMenu: () => void

    // Modal de succès de paiement
    paymentSuccessOpen: boolean
    paymentSuccessAmount: number
    showPaymentSuccess: (amount?: number) => void
    hidePaymentSuccess: () => void

    // Modal de réception de SMS
    smsRevealOpen: boolean
    smsData: ActivationData | null
    showSmsReveal: (data: ActivationData) => void
    hideSmsReveal: () => void

    // Modal de feedback de statut (Annulation, Timeout)
    statusFeedbackOpen: boolean
    statusFeedbackType: 'cancelled' | 'timeout' | null
    showStatusFeedback: (type: 'cancelled' | 'timeout') => void
    hideStatusFeedback: () => void
}

export const useUIStore = create<UIStore>((set) => ({
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

    paymentSuccessOpen: false,
    paymentSuccessAmount: 0,
    showPaymentSuccess: (amount = 0) => set({ paymentSuccessOpen: true, paymentSuccessAmount: amount }),
    hidePaymentSuccess: () => set({ paymentSuccessOpen: false }),

    smsRevealOpen: false,
    smsData: null,
    showSmsReveal: (data) => set({ smsRevealOpen: true, smsData: data }),
    hideSmsReveal: () => set({ smsRevealOpen: false, smsData: null }),

    statusFeedbackOpen: false,
    statusFeedbackType: null,
    showStatusFeedback: (type) => set({ statusFeedbackOpen: true, statusFeedbackType: type }),
    hideStatusFeedback: () => set({ statusFeedbackOpen: false }),
}))
