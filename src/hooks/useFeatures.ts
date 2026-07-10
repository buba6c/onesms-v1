// @ts-nocheck

import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/settings'

export interface Features {
    rentals_enabled: boolean
    maintenance_mode: boolean
}

export function useFeatures() {
    const { data: features, isLoading } = useQuery({
        queryKey: ['system-features'],
        queryFn: async (): Promise<Features> => {
            try {
                const settings = await getSettings(['rentals_enabled', 'maintenance_mode'])

                return {
                    rentals_enabled: settings['rentals_enabled'] === 'true',
                    maintenance_mode: settings['maintenance_mode'] === 'true'
                }
            } catch (error) {
                console.error('Failed to fetch feature flags:', error)
                throw error;
            }

            return {
                rentals_enabled: rentals ?? true,
                maintenance_mode: maintenance ?? false
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
    })

    return {
        isRentalsEnabled: features?.rentals_enabled ?? true,
        isMaintenanceMode: features?.maintenance_mode ?? false,
        isLoading
    }
}
