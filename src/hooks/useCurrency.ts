import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'XOF' | 'USD' | 'EUR';

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  // Rates against FCFA (XOF). 1 USD ~ 600 FCFA, 1 EUR ~ 655.957 FCFA
  // These could be fetched dynamically from an API in a production environment
  rates: {
    XOF: number;
    USD: number;
    EUR: number;
  };
  formatPrice: (amountInXOF: number, isUnit?: boolean) => string;
}

const formatters: Record<Currency, Intl.NumberFormat> = {
  XOF: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
};

const unitFormatters: Record<Currency, Intl.NumberFormat> = {
  XOF: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

export const useCurrency = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'XOF',
      setCurrency: (currency) => set({ currency }),
      rates: {
        XOF: 1,
        USD: 1 / 600, // 600 XOF = 1 USD
        EUR: 1 / 655.957, // 655.957 XOF = 1 EUR
      },
      formatPrice: (amountInXOF: number, isUnit = false) => {
        const { currency, rates } = get();
        if (isUnit && currency !== 'XOF') {
          const converted = amountInXOF * rates[currency];
          return unitFormatters[currency].format(converted);
        } else {
          const converted = Math.round(amountInXOF * rates[currency]);
          return formatters[currency].format(converted);
        }
      },
    }),
    {
      name: 'currency-storage',
    }
  )
);
