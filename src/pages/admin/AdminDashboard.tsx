// @ts-nocheck

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  Users, DollarSign, Phone, MessageSquare, TrendingUp, TrendingDown, RefreshCw, Loader2,
  CreditCard, Wallet, Snowflake, Activity, AlertTriangle, CheckCircle, Clock, XCircle,
  ArrowUpRight, ArrowDownRight, Zap, Eye, Settings, BarChart3, ShieldCheck, Timer, Gift,
  Calendar, Search, Filter, Plus, Globe
} from 'lucide-react'
import { getServiceLogo, getServiceLogoFallback, getCountryFlag } from "@/lib/logo-service";

import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { formatPhoneNumber } from '@/utils/phoneFormatter'

// --- INTERFACES ---

interface DashboardStats {
  // Users
  totalUsers: number
  newUsersToday: number
  newUsersYesterday: number
  activeUsers: number
  usersWithBalance: number
  // Revenue
  totalRevenueFCFA: number
  revenueTodayFCFA: number
  revenueYesterdayFCFA: number
  totalCredits: number
  // Wallet
  totalBalance: number
  totalFrozen: number
  // Activations
  totalActivations: number
  activationsToday: number
  activationsYesterday: number
  pendingActivations: number
  completedActivations: number
  cancelledActivations: number
  successRate: number
  // Rentals
  activeRentals: number
  totalRentals: number
  // SMS
  smsReceived: number
  smsToday: number
  // History for charts
  revenueHistory: { date: string; amount: number }[]
  activationsHistory: { date: string; completed: number; failed: number }[]
  // New metrics
  topServices: { service: string; count: number }[]
  countryStats: { country: string; total: number; success: number; rate: number }[]
}

interface ReferralStats {
  total: number
  pending: number
  qualified: number
  rewarded: number
  rejected: number
  expired: number
  bonusCount: number
  bonusAmount: number
}

const defaultStats: DashboardStats = {
  totalUsers: 0, newUsersToday: 0, newUsersYesterday: 0, activeUsers: 0, usersWithBalance: 0,
  totalRevenueFCFA: 0, revenueTodayFCFA: 0, revenueYesterdayFCFA: 0, totalCredits: 0,
  totalBalance: 0, totalFrozen: 0,
  totalActivations: 0, activationsToday: 0, activationsYesterday: 0,
  pendingActivations: 0, completedActivations: 0, cancelledActivations: 0, successRate: 0,
  activeRentals: 0, totalRentals: 0,
  smsReceived: 0, smsToday: 0,
  revenueHistory: [], activationsHistory: [],
  topServices: [], countryStats: []
}

const defaultReferralStats: ReferralStats = {
  total: 0, pending: 0, qualified: 0, rewarded: 0, rejected: 0, expired: 0, bonusCount: 0, bonusAmount: 0
}

// --- HELPER LOGIC (Restored) ---

// Precise logic for determining revenue amount from transaction
// Precise logic for determining revenue amount from transaction
const getAmountFCFA = (tx: any): number => {
  // Referral bonuses have no real monetary value for revenue stats
  if (tx.type === 'referral_bonus') return 0;

  // Priority 1: Explicit amount_xof in metadata (The Truth)
  if (tx.metadata?.amount_xof) {
    return Number(tx.metadata.amount_xof) || 0;
  }

  // Priority 2: PayDunya (always correct)
  if (tx.metadata?.payment_provider === 'paydunya') {
    return Number(tx.amount) || 0;
  }

  // Priority 3: MoneyFusion legacy
  // Corrected logic: Use amount*100 only if amount is small (< 50) indicating it's a pre-divided value
  if ((tx.metadata?.payment_provider === 'moneyfusion' || tx.provider === 'moneyfusion') && tx.amount && tx.amount < 50) {
    return Number(tx.amount) * 100;
  }

  // Default: Use amount as is
  return Number(tx.amount) || 0;
}

const getCreditsFromTx = (tx: any): number => {
  if (tx.metadata?.activations) return parseInt(String(tx.metadata.activations), 10) || 0;
  if (tx.metadata?.payment_provider === 'moneyfusion' && tx.amount && tx.amount < 1000) return Number(tx.amount) || 0;
  if (tx.metadata?.amount_xof) return Math.round(Number(tx.metadata.amount_xof) / 100) || 0;
  return Number(tx.amount) || 0;
}

// --- MAIN COMPONENT ---

export default function AdminDashboard() {
  const { t } = useTranslation();

  // 1. Dashboard Stats Query
  const { data: stats = defaultStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000
  })

  // 2. System Health Query (Restored)
  const { data: systemHealth = { status: 'healthy', issues: [] } } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 60000
  })

  // 3. Referral Stats Query (Restored RPC)
  const { data: referralStats = defaultReferralStats, isLoading: referralLoading, refetch: refetchReferrals } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: fetchReferralStats,
    refetchInterval: 60000
  })

  // 4. Recent Lists (Restored)
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['admin-recent-transactions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, user:users(email, name)')
        .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    refetchInterval: 30000
  })

  const { data: recentActivations = [] } = useQuery({
    queryKey: ['admin-recent-activations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('*, user:users(email)')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    refetchInterval: 30000
  })

  // --- FETCHERS ---

  async function fetchSystemHealth() {
    const issues: string[] = []
    let status = 'healthy'

    try {
      // Pending activations > 20min
      const { count: pendingCount } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'waiting'])
        .lt('created_at', new Date(Date.now() - 20 * 60 * 1000).toISOString())

      if (pendingCount && pendingCount > 0) {
        issues.push(`${pendingCount} activation(s) en attente > 20min`)
        status = 'warning'
      }

      // Frozen balance > 100
      const { data: usersWithFrozen } = await supabase.from('users').select('frozen_balance').gt('frozen_balance', 0) as { data: any[] }
      const frozenTotal = usersWithFrozen?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
      if (frozenTotal > 100) {
        issues.push(`${Math.floor(frozenTotal)} Ⓐ gelés au total`)
      }

      // Expired rentals active
      const { count: expiredRentals } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())

      if (expiredRentals && expiredRentals > 0) {
        issues.push(`${expiredRentals} location(s) expirée(s)`)
        status = 'critical'
      }

      // Failed tx (last 24h)
      const { count: failedTx } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (failedTx && failedTx > 5) {
        issues.push(`${failedTx} transaction(s) échouée(s) (24h)`)
        status = status === 'critical' ? 'critical' : 'warning'
      }

    } catch (error) {
      console.error('Error checking system health:', error)
      status = 'unknown'
    }
    return { status, issues }
  }

  async function fetchReferralStats(): Promise<ReferralStats> {
    // Try RPC first
    const { data: adminReferralStats, error: adminReferralError } = await supabase.rpc('admin_referral_stats') as { data: any[], error: any }
    if (!adminReferralError && adminReferralStats && adminReferralStats.length) {
      const row = adminReferralStats[0] as any
      return {
        total: Number(row.total ?? 0),
        pending: Number(row.pending ?? 0),
        qualified: Number(row.qualified ?? 0),
        rewarded: Number(row.rewarded ?? 0),
        rejected: Number(row.rejected ?? 0),
        expired: Number(row.expired ?? 0),
        bonusCount: Number(row.bonusCount ?? row.bonus_count ?? 0),
        bonusAmount: Number(row.bonusAmount ?? row.bonus_amount ?? 0)
      }
    }

    if (adminReferralError && adminReferralError.message !== 'Could not find the function "admin_referral_stats" in the schema "public"') {
        throw adminReferralError; // Let React Query retry it!
    }

    // Fallback manual count if RPC fails
    const countByStatus = async (status: string) => {
      const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', status)
      return count || 0
    }
    const [pending, qualified, rewarded, rejected, expired] = await Promise.all([
      countByStatus('pending'), countByStatus('qualified'), countByStatus('rewarded'), countByStatus('rejected'), countByStatus('expired')
    ])
    const { count: total } = await supabase.from('referrals').select('*', { count: 'exact', head: true })
    const { data: bonusTx } = await supabase.from('transactions').select('amount, metadata').eq('type', 'referral_bonus').eq('status', 'completed')
    const bonusAmount = bonusTx?.reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    return {
      total: total || 0, pending, qualified, rewarded, rejected, expired,
      bonusCount: bonusTx?.length || 0, bonusAmount
    }
  }

  async function fetchDashboardStats(): Promise<DashboardStats> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const todayISO = todayStart.toISOString()
    const yesterdayISO = yesterdayStart.toISOString()
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    // Chunk 1: Basic Counts
    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: newUsersYesterday },
      { count: activeUsers }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayISO).lt('created_at', todayISO),
      supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'banned')
    ])

    // Chunk 2: Heavy Data
    const [
      { data: userBalances },
      { data: allTransactions },
      { data: activations }
    ] = await Promise.all([
      supabase.from('users').select('balance, frozen_balance') as Promise<{ data: any[] }>,
      supabase.from('transactions').select('amount, metadata, created_at, type, status, provider')
        .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit'])
        .not('type', 'in', '(' + ['purchase', 'rental', 'number_purchase', 'debit'].join(',') + ')')
        .in('status', ['completed', 'paid', 'success', 'confirmed', 'validated'])
        .limit(10000) as Promise<{ data: any[] }>,
      supabase.from('activations').select('status, created_at, service_code, country_code').gte('created_at', sevenDaysAgoISO) as Promise<{ data: any[] }>
    ])

    // Chunk 3: Activation & Rental Counts
    const [
      { count: absoluteTotalActivations },
      { count: activeRentals },
      { count: totalRentals },
      { count: smsReceived },
      { count: smsToday }
    ] = await Promise.all([
      supabase.from('activations').select('*', { count: 'exact', head: true }),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('rentals').select('*', { count: 'exact', head: true }),
      supabase.from('activations').select('*', { count: 'exact', head: true }).not('sms_code', 'is', null),
      supabase.from('activations').select('*', { count: 'exact', head: true }).not('sms_code', 'is', null).gte('created_at', todayISO)
    ])

    // --- Processing ---
    
    // Users
    const usersWithBalance = userBalances?.filter(u => (u.balance || 0) > 0).length || 0
    const totalBalance = userBalances?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0
    const totalFrozen = userBalances?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0

    // Transactions
    const totalRevenueFCFA = allTransactions?.reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0
    const recentTransactions = allTransactions?.filter(tx => new Date(tx.created_at) >= sevenDaysAgo) || []

    const revenueTodayFCFA = recentTransactions
      .filter(tx => new Date(tx.created_at) >= todayStart)
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    const revenueYesterdayFCFA = recentTransactions
      .filter(tx => {
        const d = new Date(tx.created_at)
        return d >= yesterdayStart && d < todayStart
      })
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    const totalCredits = allTransactions?.reduce((sum, tx) => sum + getCreditsFromTx(tx), 0) || 0

    // Chart Data: Revenue
    const revenueHistoryMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      revenueHistoryMap.set(d.toISOString().split('T')[0], 0)
    }
    recentTransactions?.forEach(tx => {
      const dateKey = tx.created_at.split('T')[0]
      if (revenueHistoryMap.has(dateKey)) {
        revenueHistoryMap.set(dateKey, (revenueHistoryMap.get(dateKey) || 0) + getAmountFCFA(tx))
      }
    })
    const revenueHistory = Array.from(revenueHistoryMap.entries()).map(([date, amount]) => ({ date, amount }))

    // Activations
    const activationsToday = activations?.filter(a => a.created_at >= todayISO).length || 0
    const activationsYesterday = activations?.filter(a => a.created_at >= yesterdayISO && a.created_at < todayISO).length || 0

    const pendingActivations = activations?.filter(a => ['pending', 'waiting'].includes(a.status)).length || 0
    const completedActivationsWindow = activations?.filter(a => ['received', 'completed'].includes(a.status)).length || 0
    const cancelledActivationsWindow = activations?.filter(a => a.status === 'cancelled').length || 0

    const totalActivationsWindow = activations?.length || 0
    const successRate = totalActivationsWindow > 0 ? Math.round((completedActivationsWindow / totalActivationsWindow) * 100) : 0

    // Chart Data: Activations
    const activationsHistoryMap = new Map<string, { completed: number, failed: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      activationsHistoryMap.set(d.toISOString().split('T')[0], { completed: 0, failed: 0 })
    }
    activations?.forEach(a => {
      const dateKey = a.created_at.split('T')[0]
      if (activationsHistoryMap.has(dateKey)) {
        const curr = activationsHistoryMap.get(dateKey)!
        if (['received', 'completed'].includes(a.status)) curr.completed++
        else curr.failed++
      }
    })
    const activationsHistory = Array.from(activationsHistoryMap.entries()).map(([date, counts]) => ({
      date, ...counts
    }))

    // Calculate Top Services
    const serviceMap = new Map<string, number>()
    const countryMap = new Map<string, { total: number, success: number }>()

    activations?.forEach(a => {
      if (a.service_code) {
        serviceMap.set(a.service_code, (serviceMap.get(a.service_code) || 0) + 1)
      }
      if (a.country_code) {
        const c = a.country_code.toLowerCase()
        const isSuccess = ['received', 'completed'].includes(a.status)
        if (!countryMap.has(c)) countryMap.set(c, { total: 0, success: 0 })
        countryMap.get(c)!.total++
        if (isSuccess) countryMap.get(c)!.success++
      }
    })

    const topServices = Array.from(serviceMap.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const countryStats = Array.from(countryMap.entries())
      .map(([country, stats]) => ({
        country,
        total: stats.total,
        success: stats.success,
        rate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    return {
      totalUsers: totalUsers || 0, newUsersToday: newUsersToday || 0, newUsersYesterday: newUsersYesterday || 0,
      activeUsers: activeUsers || 0, usersWithBalance,
      totalRevenueFCFA,
      revenueTodayFCFA, revenueYesterdayFCFA, totalCredits,
      totalBalance, totalFrozen,
      totalActivations: absoluteTotalActivations || 0, activationsToday, activationsYesterday,
      pendingActivations, completedActivations: completedActivationsWindow, cancelledActivations: cancelledActivationsWindow,
      successRate,
      activeRentals: activeRentals || 0, totalRentals: totalRentals || 0,
      smsReceived: smsReceived || 0, smsToday: smsToday || 0,
      revenueHistory, activationsHistory,
      topServices, countryStats
    }
  }

  // --- SUB COMPONENTS ---

  const StatCard = ({ title, value, subtext, icon: Icon, trend, trendUp, colorClass }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <div className={cn("p-3 rounded-full", colorClass.bg)}>
              <Icon className={cn("w-6 h-6", colorClass.text)} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <div className={cn("flex items-center px-2 py-1 rounded text-xs font-medium", trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
              {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {trend}
            </div>
          )}
        </div>
        {subtext && (
          <div className="mt-4 text-xs text-muted-foreground">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics</h1>
          
          <div className="hidden md:flex bg-gray-100 rounded-full p-1 items-center">
            <Link to="/admin/analytics" className="px-4 py-1.5 bg-white text-sm font-semibold rounded-full shadow-sm text-gray-900 hover:bg-gray-50 transition-colors">
              Full Statistics
            </Link>
            <Link to="/admin/transactions" className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Results Summary
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/admin/settings">
            <Button variant="outline" className="h-10 w-10 rounded-full p-0 border-gray-200 text-gray-500 hover:bg-gray-50">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
          <Button className="h-10 w-10 rounded-full p-0 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm" onClick={() => { refetchStats(); refetchReferrals(); }} disabled={statsLoading || referralLoading}>
            <RefreshCw className={cn("w-5 h-5", (statsLoading || referralLoading) && "animate-spin text-cyan-600")} />
          </Button>
          <Link to="/admin/users" className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:bg-blue-200 transition-colors">
            <Users className="w-5 h-5 text-blue-600" />
          </Link>
        </div>
      </div>

      {/* TOP WIDGETS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* Widget 1: Team Payments (Activations Status) */}
        <Card className="border-dashed border-2 border-gray-200 shadow-none hover:border-gray-300 transition-colors">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Statut Activations</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {stats.activationsToday} aujourd'hui
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Phone className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600">Re</div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-600">Ac</div>
                <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-xs font-bold text-amber-600">Pe</div>
                <div className="w-10 h-10 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600">
                  {stats.successRate}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget 2: Savings (Revenus Line Chart) */}
        <Card className="border-dashed border-2 border-gray-200 shadow-none hover:border-gray-300 transition-colors">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Revenus</h3>
              </div>
            </div>
            
            <div className="h-[60px] w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueHistory}>
                  <defs>
                    <linearGradient id="colorRevMini" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="amount" stroke="#818cf8" strokeWidth={2} fill="url(#colorRevMini)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(stats.revenueTodayFCFA)}</h2>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                  <span className={cn("flex items-center", stats.revenueTodayFCFA >= stats.revenueYesterdayFCFA ? "text-red-500" : "text-green-500")}>
                    {stats.revenueTodayFCFA >= stats.revenueYesterdayFCFA ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {stats.revenueYesterdayFCFA > 0 ? Math.abs(((stats.revenueTodayFCFA - stats.revenueYesterdayFCFA) / stats.revenueYesterdayFCFA) * 100).toFixed(0) : 0}%
                  </span>
                  hier
                </p>
              </div>
              <Link to="/admin/analytics" className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Widget 3: Inscriptions */}
        <Card className="border-dashed border-2 border-gray-200 shadow-none hover:border-gray-300 transition-colors">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inscriptions</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded", stats.newUsersToday >= stats.newUsersYesterday ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                    {stats.newUsersToday >= stats.newUsersYesterday ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {stats.newUsersYesterday > 0 ? Math.abs(((stats.newUsersToday - stats.newUsersYesterday) / stats.newUsersYesterday) * 100).toFixed(0) : 100}% par rapport à hier
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            
            <div className="flex items-end justify-between mt-auto">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Aujourd'hui</p>
                <h2 className="text-4xl font-black tracking-tight text-blue-600">+{stats.newUsersToday}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Hier</p>
                <h2 className="text-xl font-bold text-gray-400">+{stats.newUsersYesterday}</h2>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget 4: Locations (Rentals) */}
        <Card className="border-dashed border-2 border-gray-200 shadow-none hover:border-gray-300 transition-colors bg-orange-50/30">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Locations</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    En cours
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Timer className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            
            <div className="flex items-end justify-between mt-auto">
              <div>
                <p className="text-xs text-orange-600/80 uppercase tracking-wider font-semibold mb-1">Actives</p>
                <h2 className="text-4xl font-black tracking-tight text-orange-600">{stats.activeRentals}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Total histo.</p>
                <h2 className="text-xl font-bold text-gray-500">{stats.totalRentals}</h2>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget 5: Meilleur Service Choisi */}
        <Card className="bg-gradient-to-br from-cyan-400 to-blue-500 border-0 text-white shadow-lg shadow-cyan-500/20 relative overflow-hidden">
          {/* Subtle pattern / sparkles */}
          <div className="absolute top-4 right-4 opacity-50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white"/>
            </svg>
          </div>
          
          <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
            <div>
              <p className="text-cyan-50 text-sm font-medium opacity-90 mb-1">Meilleur Service Choisi (7J)</p>
              {stats.topServices.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm">
                    <img src={getServiceLogo(stats.topServices[0].service)} onError={(e) => getServiceLogoFallback(e, stats.topServices[0].service)} alt="logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight capitalize">{stats.topServices[0].service}</h2>
                    <p className="text-cyan-100 text-xs font-bold">{stats.topServices[0].count} activations</p>
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl font-bold tracking-tight">Aucune donnée</h2>
              )}
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4 leading-tight">Gérez les <br/>activations</h3>
              
              <div className="flex items-center gap-3">
                <Link to="/admin/activations" className="px-5 py-2.5 bg-white text-cyan-600 rounded-full text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">
                  Voir tout
                </Link>
                <Link to="/admin/analytics" className="px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-bold shadow-sm hover:bg-black transition-colors">
                  Analyses
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* SYSTEM ALERTS & RECENT ACTIVITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: System Alerts & Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                État du Système
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {systemHealth.issues.length > 0 ? (
                <div className="space-y-3">
                  {systemHealth.issues.map((issue: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-rose-900">{issue}</p>
                    </div>
                  ))}
                  <Link to="/admin/monitoring" className="block w-full text-center py-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors mt-4">
                    Voir le Monitoring
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Système Sain</h4>
                  <p className="text-xs text-gray-500 mt-1">Aucune alerte critique détectée.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
             <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total SMS Reçus</p>
                    <h3 className="text-3xl font-bold mt-1">{stats.smsReceived.toLocaleString()}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-4 mt-4">
                  <span className="text-gray-400">Aujourd'hui</span>
                  <span className="font-bold text-emerald-400">+{stats.smsToday}</span>
                </div>
             </CardContent>
          </Card>

          {/* Top Services Activated */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-600" />
                Services les plus utilisés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {stats.topServices.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center p-2 border border-gray-100 shrink-0">
                        <img src={getServiceLogo(s.service)} onError={(e) => getServiceLogoFallback(e, s.service)} alt="logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 capitalize flex items-center gap-2">
                          <span className="text-gray-400 text-xs font-mono">#{idx + 1}</span> {s.service}
                        </h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{s.count}</span>
                    </div>
                  </div>
                ))}
                {stats.topServices.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">Aucune donnée de service.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SMS Success Rate by Country */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white flex flex-col">
            <CardHeader className="border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                Réussite par pays (7J)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              
              {/* Donut Chart */}
              {stats.countryStats.length > 0 && (
                <div className="h-48 w-full border-b border-gray-50 flex items-center justify-center relative bg-gray-50/30">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.countryStats.filter(c => c.success > 0)}
                        dataKey="success"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {stats.countryStats.filter(c => c.success > 0).map((entry, index) => {
                          const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => [value + ' succès', name.toUpperCase()]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900 leading-none">
                      {stats.countryStats.reduce((sum, c) => sum + c.success, 0)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Succès</span>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-50 overflow-y-auto flex-1 max-h-[300px]">
                {stats.countryStats.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden">
                        <img src={getCountryFlag(c.country)} alt={c.country} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase">{c.country}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">{c.total} requêtes</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("text-xs font-bold", c.rate >= 50 ? "text-emerald-600" : c.rate >= 20 ? "text-amber-600" : "text-red-600")}>
                        {c.rate}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", c.rate >= 50 ? "bg-emerald-500" : c.rate >= 20 ? "bg-amber-500" : "bg-red-500")}
                          style={{ width: `${c.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.countryStats.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">Aucune donnée pays.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMNS: Transactions & Activations Lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Activations */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-cyan-600" />
                Dernières Activations
              </CardTitle>
              <Link to="/admin/activations" className="text-sm font-semibold text-cyan-600 hover:text-cyan-700">Voir tout</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {recentActivations.map((act: any, idx) => (
                  <div key={act.id || idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${act.user?.email || 'user'}`} alt="avatar" className="w-full h-full opacity-90" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase">{act.service_code}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{act.phone ? formatPhoneNumber(act.phone) : 'En attente...'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1",
                        ['completed', 'received'].includes(act.status) ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {['completed', 'received'].includes(act.status) ? 'Succès' : 'En attente'}
                      </span>
                      <p className="text-xs text-gray-500 font-medium">{formatDate(act.created_at, 'short')}</p>
                    </div>
                  </div>
                ))}
                {recentActivations.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">Aucune activation récente.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-gray-50 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Dernières Transactions
              </CardTitle>
              <Link to="/admin/transactions" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">Voir tout</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {recentTransactions.map((tx: any, idx) => (
                  <div key={tx.id || idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${tx.user?.email || 'user'}`} alt="avatar" className="w-full h-full opacity-90" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{tx.user?.name || tx.user?.email?.split('@')[0] || 'Utilisateur'}</h4>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{tx.type} • {formatDate(tx.created_at, 'short')}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-sm font-bold text-gray-900">{formatCurrency(getAmountFCFA(tx))}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          tx.status === 'completed' ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {tx.status === 'completed' ? 'Complété' : 'En attente'}
                        </span>
                      </div>
                      <Link to={`/admin/transactions?search=${tx.reference || tx.payment_ref || tx.id}`} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">Aucune transaction récente.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
