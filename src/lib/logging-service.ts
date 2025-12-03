import { supabase } from './supabase'

export type LogLevel = 'info' | 'warning' | 'error' | 'success'
export type LogCategory = 'api' | 'payment' | 'user' | 'sync' | 'system' | 'sms' | 'rent'

export interface SystemLog {
  id: string
  level: LogLevel
  category: LogCategory
  message: string
  metadata: Record<string, any>
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface LogFilters {
  level?: LogLevel
  category?: LogCategory
  search?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Log an event to the system_logs table
 */
export const logEvent = async (
  level: LogLevel,
  category: LogCategory,
  message: string,
  metadata: Record<string, any> = {},
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('system_logs').insert({
      level,
      category,
      message,
      metadata,
      user_id: userId || null,
      ip_address: null, // Could be set from headers
      user_agent: navigator.userAgent
    } as any)

    if (error) throw error

    // Also console log in development mode only
    if (import.meta.env.DEV) {
      const emoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        success: '✅'
      }[level]

      console.log(`${emoji} [${category.toUpperCase()}] ${message}`, metadata)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Failed to log event:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get system logs with filters
 */
export const getSystemLogs = async (filters: LogFilters = {}): Promise<SystemLog[]> => {
  try {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.level) {
      query = query.eq('level', filters.level)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    if (filters.search) {
      query = query.ilike('message', `%${filters.search}%`)
    }

    // Pagination
    const limit = filters.limit || 50
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error: any) {
    console.error('Failed to fetch logs:', error)
    return []
  }
}

/**
 * Get log statistics
 */
export const getLogStats = async (): Promise<{
  totalLogs: number
  errorCount: number
  warningCount: number
  todayLogs: number
  byCategory: Record<string, number>
}> => {
  try {
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('level, category, created_at') as { data: { level: string; category: string; created_at: string }[] | null; error: any }

    if (error) throw error

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = {
      totalLogs: logs?.length || 0,
      errorCount: logs?.filter((l: any) => l.level === 'error').length || 0,
      warningCount: logs?.filter((l: any) => l.level === 'warning').length || 0,
      todayLogs: logs?.filter((l: any) => new Date(l.created_at) >= today).length || 0,
      byCategory: {} as Record<string, number>
    }

    // Count by category
    logs?.forEach((log: any) => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
    })

    return stats
  } catch (error) {
    console.error('Failed to fetch log stats:', error)
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      todayLogs: 0,
      byCategory: {}
    }
  }
}

/**
 * Export logs to CSV
 */
export const exportLogsToCSV = (logs: SystemLog[]): string => {
  const headers = ['ID', 'Level', 'Category', 'Message', 'User ID', 'Created At', 'Metadata']
  const rows = logs.map(log => [
    log.id,
    log.level,
    log.category,
    log.message.replace(/,/g, ';'), // Escape commas
    log.user_id || 'N/A',
    new Date(log.created_at).toLocaleString(),
    JSON.stringify(log.metadata).replace(/,/g, ';')
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csv
}

/**
 * Download CSV file
 */
export const downloadCSV = (csv: string, filename: string = 'system-logs.csv') => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
