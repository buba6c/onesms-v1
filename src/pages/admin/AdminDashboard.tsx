
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
  Calendar, Search, Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

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
  revenueHistory: [], activationsHistory: []
}

const defaultReferralStats: ReferralStats = {
  total: 0, pending: 0, qualified: 0, rewarded: 0, rejected: 0, expired: 0, bonusCount: 0, bonusAmount: 0
}

// --- HELPER LOGIC (Restored) ---

// Precise logic for determining revenue amount from transaction
const getAmountFCFA = (tx: any): number => {
  // Referral bonuses have no real monetary value for revenue stats
  if (tx.type === 'referral_bonus') return 0;

  // Priority 1: Explicit amount_xof in metadata
  if (tx.metadata?.amount_xof) {
    return Number(tx.metadata.amount_xof) || 0;
  }

  // Priority 2: PayDunya (amount is already in FCFA)
  if (tx.metadata?.payment_provider === 'paydunya') {
    return Number(tx.amount) || 0;
  }

  // Priority 3: MoneyFusion legacy (amount < 1000 usually means activations count, x100 for FCFA)
  if (tx.metadata?.payment_provider === 'moneyfusion' && tx.amount && tx.amount < 1000) {
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString()

    // Users
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: newUsersToday } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO)
    const { count: newUsersYesterday } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayISO).lt('created_at', todayISO)
    const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'banned')

    const { data: userBalances } = await supabase.from('users').select('balance, frozen_balance') as { data: any[] }
    const usersWithBalance = userBalances?.filter(u => (u.balance || 0) > 0).length || 0
    const totalBalance = userBalances?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0
    const totalFrozen = userBalances?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0

    // Transactions
    // Get last 7 days for charts
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, created_at, metadata, type, status')
      .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit'])
      .eq('status', 'completed')
      .gte('created_at', sevenDaysAgo.toISOString()) as { data: any[] }

    const revenueTodayFCFA = transactions
      ?.filter(tx => tx.created_at >= todayISO)
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    const revenueYesterdayFCFA = transactions
      ?.filter(tx => tx.created_at >= yesterdayISO && tx.created_at < todayISO)
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    const totalCredits = transactions?.reduce((sum, tx) => sum + getCreditsFromTx(tx), 0) || 0

    // Chart Data: Revenue
    const revenueHistoryMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      revenueHistoryMap.set(d.toISOString().split('T')[0], 0)
    }
    transactions?.forEach(tx => {
      const dateKey = tx.created_at.split('T')[0]
      if (revenueHistoryMap.has(dateKey)) {
        revenueHistoryMap.set(dateKey, (revenueHistoryMap.get(dateKey) || 0) + getAmountFCFA(tx))
      }
    })
    const revenueHistory = Array.from(revenueHistoryMap.entries()).map(([date, amount]) => ({ date, amount }))

    // Activations
    const { data: activations } = await supabase
      .from('activations')
      .select('status, created_at')
      .gte('created_at', sevenDaysAgo.toISOString()) as { data: any[] }

    const { count: absoluteTotalActivations } = await supabase.from('activations').select('*', { count: 'exact', head: true })

    const activationsToday = activations?.filter(a => a.created_at >= todayISO).length || 0
    const activationsYesterday = activations?.filter(a => a.created_at >= yesterdayISO && a.created_at < todayISO).length || 0

    const pendingActivations = activations?.filter(a => ['pending', 'waiting'].includes(a.status)).length || 0
    const completedActivationsWindow = activations?.filter(a => ['received', 'completed'].includes(a.status)).length || 0
    const cancelledActivationsWindow = activations?.filter(a => a.status === 'cancelled').length || 0

    // Note: Success rate calculated on window
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

    // Rentals & SMS
    const { count: activeRentals } = await supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { count: totalRentals } = await supabase.from('rentals').select('*', { count: 'exact', head: true })
    const { count: smsReceived } = await supabase.from('activations').select('*', { count: 'exact', head: true }).not('sms_code', 'is', null)
    const { count: smsToday } = await supabase.from('activations').select('*', { count: 'exact', head: true }).not('sms_code', 'is', null).gte('created_at', todayISO)

    return {
      totalUsers: totalUsers || 0, newUsersToday: newUsersToday || 0, newUsersYesterday: newUsersYesterday || 0,
      activeUsers: activeUsers || 0, usersWithBalance,
      totalRevenueFCFA: 0, // Placeholder, usually expensive to calc total
      revenueTodayFCFA, revenueYesterdayFCFA, totalCredits,
      totalBalance, totalFrozen,
      totalActivations: absoluteTotalActivations || 0, activationsToday, activationsYesterday,
      pendingActivations, completedActivations: completedActivationsWindow, cancelledActivations: cancelledActivationsWindow,
      successRate,
      activeRentals: activeRentals || 0, totalRentals: totalRentals || 0,
      smsReceived: smsReceived || 0, smsToday: smsToday || 0,
      revenueHistory, activationsHistory
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
    <div className="space-y-8 p-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">
            Vue d'ensemble de l'activité du {formatDate(new Date(), 'long')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* System Health Badge (Restored) */}
          <Badge variant={
            systemHealth.status === 'healthy' ? 'outline' :
              systemHealth.status === 'warning' ? 'secondary' : 'destructive'
          } className={cn("flex items-center gap-1 h-9", systemHealth.status === 'healthy' && "bg-green-50 text-green-700 border-green-200")}>
            {systemHealth.status === 'healthy' ? (
              <CheckCircle className="w-3 h-3" />
            ) : systemHealth.status === 'warning' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {systemHealth.status === 'healthy' ? 'Système OK' : `${systemHealth.issues.length} alerte(s)`}
          </Badge>

          <Button variant="outline" onClick={() => { refetchStats(); refetchReferrals(); }} disabled={statsLoading} className="h-10">
            {statsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Actualiser
          </Button>
          <Link to="/admin/settings">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Settings className="w-5 h-5 text-gray-500" />
            </Button>
          </Link>
        </div>
      </div>

      {/* SYSTEM ALERTS (Restored) */}
      {systemHealth.issues.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10 mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-700">Alertes Système</h4>
                <ul className="text-sm text-yellow-600 mt-1 space-y-1">
                  {systemHealth.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STATS ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenu du Jour"
          value={`${formatCurrency(stats.revenueTodayFCFA)}`}
          subtext={`Hier: ${formatCurrency(stats.revenueYesterdayFCFA)}`}
          icon={DollarSign}
          trend={stats.revenueYesterdayFCFA > 0 ? `${(((stats.revenueTodayFCFA - stats.revenueYesterdayFCFA) / stats.revenueYesterdayFCFA) * 100).toFixed(1)}%` : 'N/A'}
          trendUp={stats.revenueTodayFCFA >= stats.revenueYesterdayFCFA}
          colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
        />
        <StatCard
          title="Nouveaux Utilisateurs"
          value={`+${stats.newUsersToday}`}
          subtext={`${stats.totalUsers} utilisateurs au total`}
          icon={Users}
          trend={stats.newUsersYesterday > 0 ? `${(((stats.newUsersToday - stats.newUsersYesterday) / stats.newUsersYesterday) * 100).toFixed(1)}%` : 'N/A'}
          trendUp={stats.newUsersToday >= stats.newUsersYesterday}
          colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
        />
        <StatCard
          title="Activations (24h)"
          value={stats.activationsToday}
          subtext={`${stats.pendingActivations} en attente`}
          icon={Phone}
          trend={stats.activationsYesterday > 0 ? `${(((stats.activationsToday - stats.activationsYesterday) / stats.activationsYesterday) * 100).toFixed(1)}%` : 'N/A'}
          trendUp={stats.activationsToday >= stats.activationsYesterday}
          colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
        />
        <StatCard
          title="Solde Utilisateurs"
          value={`${stats.totalBalance.toLocaleString()} Ⓐ`}
          subtext={`${stats.totalFrozen.toLocaleString()} Ⓐ gelés en attente`}
          icon={Wallet}
          colorClass={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* REVENUE CHART */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Revenus (7 derniers jours)</CardTitle>
            <CardDescription>Évolution des transactions validées</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueHistory}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => formatDate(val, 'short')}
                  axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10}
                />
                <YAxis
                  axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenu"]}
                  labelFormatter={(label) => formatDate(label, 'long')}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ACTIVATIONS CHART */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Activations</CardTitle>
            <CardDescription>Réussite vs Échecs (7j)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activationsHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis
                  dataKey="date" tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <RechartsTooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label) => formatDate(label, 'long')}
                />
                <Legend iconType="circle" fontSize={12} wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="completed" name="Réussies" fill="#a855f7" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="failed" name="Échouées" fill="#cbd5e1" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Utilisateurs', path: '/admin/users', icon: Users, color: 'bg-blue-500' },
          { label: 'Transactions', path: '/admin/transactions', icon: CreditCard, color: 'bg-green-500' },
          { label: 'Activations', path: '/admin/activations', icon: Phone, color: 'bg-purple-500' },
          { label: 'Messages', path: '/admin/contact-messages', icon: MessageSquare, color: 'bg-pink-500' },
          { label: 'Locations', path: '/admin/rentals', icon: Clock, color: 'bg-orange-500' },
          { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, color: 'bg-cyan-500' },
        ].map(action => (
          <Link key={action.path} to={action.path}>
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-sm ring-1 ring-gray-100">
              <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* RECENT ACTIVITY LISTS (Restored) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECENT TRANSACTIONS */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              Dernières Recharges
            </CardTitle>
            <Link to="/admin/transactions" className="text-primary hover:underline text-sm flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0 divide-y">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", tx.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500')} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.user?.email || 'User'}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+{formatCurrency(getAmountFCFA(tx))}</p>
                    <p className="text-xs text-gray-400">{tx.metadata?.payment_provider || 'manual'}</p>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune donnée</p>}
            </div>
          </CardContent>
        </Card>

        {/* RECENT ACTIVATIONS */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-500" />
              Dernières Activations
            </CardTitle>
            <Link to="/admin/activations" className="text-primary hover:underline text-sm flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0 divide-y">
              {recentActivations.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      a.status === 'completed' ? "bg-green-100 text-green-700" :
                        a.status === 'pending' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    )}>
                      {a.status}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.user?.email || 'User'}</p>
                      <p className="text-xs text-gray-500">{a.service_name || 'Service'} - {formatCurrency(a.price)}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(a.created_at)}
                  </div>
                </div>
              ))}
              {recentActivations.length === 0 && <p className="text-center text-muted-foreground py-4">Aucune donnée</p>}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
