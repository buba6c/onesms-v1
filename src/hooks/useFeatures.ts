
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Features {
    rentals_enabled: boolean
}

export function useFeatures() {
    const { data: features, isLoading } = useQuery({
        queryKey: ['system-features'],
        queryFn: async (): Promise<Features> => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value')
                .eq('key', 'rentals_enabled')
                .single()

            if (error) {
                console.warn('Failed to fetch feature flags:', error)
                // Default to true if missing to avoid breaking legacy behavior unexpectedly
                return { rentals_enabled: true }
            }

            // Value is stored as string 'true'/'false'
            const isEnabled = data?.value === 'true'
            return { rentals_enabled: isEnabled }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: 2
    })

    return {
        isRentalsEnabled: features?.rentals_enabled ?? true, // Default true while loading/error
        isLoading
    }
}
