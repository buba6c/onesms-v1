import { create } from 'zustand'

interface UIStore {
    mobileMenuOpen: boolean
    setMobileMenuOpen: (open: boolean) => void
    toggleMobileMenu: () => void
}

export const useUIStore = create<UIStore>((set) => ({
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
}))
