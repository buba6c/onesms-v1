
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Features {
    rentals_enabled: boolean
    maintenance_mode: boolean
}

export function useFeatures() {
    const { data: features, isLoading } = useQuery({
        queryKey: ['system-features'],
        queryFn: async (): Promise<Features> => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['rentals_enabled', 'maintenance_mode'])

            if (error) {
                console.warn('Failed to fetch feature flags:', error)
                return { rentals_enabled: true, maintenance_mode: false }
            }

            // Map results
            const rentals = data?.find(s => s.key === 'rentals_enabled')?.value === 'true'
            const maintenance = data?.find(s => s.key === 'maintenance_mode')?.value === 'true'

            return {
                rentals_enabled: rentals ?? true,
                maintenance_mode: maintenance ?? false
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 2
    })

    return {
        isRentalsEnabled: features?.rentals_enabled ?? true,
        isMaintenanceMode: features?.maintenance_mode ?? false,
        isLoading
    }
}
