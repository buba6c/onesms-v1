 
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { 
  Users, DollarSign, Phone, MessageSquare, TrendingUp, TrendingDown, RefreshCw, Loader2,
  CreditCard, Wallet, Snowflake, Activity, AlertTriangle, CheckCircle, Clock, XCircle,
  ArrowUpRight, ArrowDownRight, Zap, Eye, Settings, BarChart3, ShieldCheck, Timer, Gift
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface DashboardStats {
  // Utilisateurs
  totalUsers: number
  newUsersToday: number
  newUsersYesterday: number
  activeUsers: number
  usersWithBalance: number
  // Revenus
  totalRevenueFCFA: number
  revenueTodayFCFA: number
  revenueYesterdayFCFA: number
  totalCredits: number
  // Wallet
  totalBalance: number
  totalFrozen: number
  totalAvailable: number
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
}

const defaultStats: DashboardStats = {
  totalUsers: 0, newUsersToday: 0, newUsersYesterday: 0, activeUsers: 0, usersWithBalance: 0,
  totalRevenueFCFA: 0, revenueTodayFCFA: 0, revenueYesterdayFCFA: 0, totalCredits: 0,
  totalBalance: 0, totalFrozen: 0, totalAvailable: 0,
  totalActivations: 0, activationsToday: 0, activationsYesterday: 0,
  pendingActivations: 0, completedActivations: 0, cancelledActivations: 0, successRate: 0,
  activeRentals: 0, totalRentals: 0,
  smsReceived: 0, smsToday: 0
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

const defaultReferralStats: ReferralStats = {
  total: 0,
  pending: 0,
  qualified: 0,
  rewarded: 0,
  rejected: 0,
  expired: 0,
  bonusCount: 0,
  bonusAmount: 0
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  
  // Auto-refresh every 30s
  const { data: stats = defaultStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000 // 30 seconds
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['admin-recent-transactions'],
    queryFn: fetchRecentTransactions,
    refetchInterval: 30000
  })

  const { data: recentUsers = [] } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: fetchRecentUsers,
    refetchInterval: 30000
  })

  const { data: systemHealth = { status: 'healthy', issues: [] } } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 60000
  })

  const { data: referralStats = defaultReferralStats, isLoading: referralLoading, refetch: refetchReferrals } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: fetchReferralStats,
    refetchInterval: 60000
  })

  const { data: recentActivations = [] } = useQuery({
    queryKey: ['admin-recent-activations'],
    queryFn: fetchRecentActivations,
    refetchInterval: 30000
  })

  async function fetchDashboardStats(): Promise<DashboardStats> {
    return await fetchDashboardData()
  }

  async function fetchRecentTransactions() {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*, user:users(email, name)')
        .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit'])
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    } catch (error) {
      console.error('[AdminDashboard] recent transactions error:', error)
      return []
    }
  }

  async function fetchRecentUsers() {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    } catch (error) {
      console.error('[AdminDashboard] recent users error:', error)
      return []
    }
  }

  async function fetchRecentActivations() {
    try {
      const { data } = await supabase
        .from('activations')
        .select('*, user:users(email)')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    } catch (error) {
      console.error('[AdminDashboard] recent activations error:', error)
      return []
    }
  }

  async function fetchSystemHealth() {
    const issues: string[] = []
    let status = 'healthy'

    try {
      // Check pending activations
      const { count: pendingCount } = await supabase
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'waiting'])
        .lt('created_at', new Date(Date.now() - 20 * 60 * 1000).toISOString())

      if (pendingCount && pendingCount > 0) {
        issues.push(`${pendingCount} activation(s) en attente > 20min`)
        status = 'warning'
      }

      // Check frozen balance issues
      const { data: usersWithFrozen } = await supabase
        .from('users')
        .select('id, frozen_balance')
        .gt('frozen_balance', 0)

      const frozenTotal = usersWithFrozen?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
      if (frozenTotal > 100) {
        issues.push(`${Math.floor(frozenTotal)} Ⓐ gelés au total`)
      }

      // Check expired rentals
      const { count: expiredRentals } = await supabase
        .from('rentals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())

      if (expiredRentals && expiredRentals > 0) {
        issues.push(`${expiredRentals} location(s) expirée(s)`)
        status = 'critical'
      }

      // Check failed transactions
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
    // Utilise une fonction RPC en SECURITY DEFINER pour bypasser le RLS sur referrals/transactions
    const { data: adminReferralStats, error: adminReferralError } = await supabase.rpc('admin_referral_stats')
    if (!adminReferralError && adminReferralStats?.length) {
      const row = adminReferralStats[0] as Partial<ReferralStats>
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
    if (adminReferralError) {
      console.warn('[AdminDashboard] admin_referral_stats RPC error fallback to RLS path:', adminReferralError.message)
    }

    const countByStatus = async (status: string) => {
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return count || 0
    }

    const [pending, qualified, rewarded, rejected, expired] = await Promise.all([
      countByStatus('pending'),
      countByStatus('qualified'),
      countByStatus('rewarded'),
      countByStatus('rejected'),
      countByStatus('expired')
    ])

    const { count: total } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })

    const { data: bonusTx } = await supabase
      .from('transactions')
      .select('amount, metadata')
      .eq('type', 'referral_bonus')
      .eq('status', 'completed')

    const getAmountFCFA = (tx: any) => tx.metadata?.amount_xof || (tx.amount * 100) || 0
    const bonusAmount = bonusTx?.reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

    return {
      total: total || 0,
      pending,
      qualified,
      rewarded,
      rejected,
      expired,
      bonusCount: bonusTx?.length || 0,
      bonusAmount
    }
  }

  const fetchDashboardData = async (): Promise<DashboardStats> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString()

    // Fetch users
    const { data: users } = await supabase
      .from('users')
      .select('*')

    // Fetch transactions (recharges only)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['recharge', 'topup', 'credit', 'payment', 'deposit'])
      .eq('status', 'completed')

    // Fetch activations
    const { data: activations } = await supabase
      .from('activations')
      .select('status, sms_code, price, created_at')

    // Fetch rentals
    const { count: activeRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })

    // Users stats
    const totalUsers = users?.length || 0
    const newUsersToday = users?.filter(u => u.created_at >= todayISO).length || 0
    const newUsersYesterday = users?.filter(u => u.created_at >= yesterdayISO && u.created_at < todayISO).length || 0
    const activeUsers = users?.filter(u => u.role !== 'banned').length || 0
    const usersWithBalance = users?.filter(u => (u.balance || 0) > 0).length || 0

    // Wallet stats
    const totalBalance = users?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0
    const totalFrozen = users?.reduce((sum, u) => sum + (u.frozen_balance || 0), 0) || 0
    const totalAvailable = totalBalance - totalFrozen

    // Revenue stats (FCFA from metadata.amount_xof)
    const getAmountFCFA = (tx: any) => tx.metadata?.amount_xof || (tx.amount * 100) || 0
    const totalRevenueFCFA = transactions?.reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0
    const revenueTodayFCFA = transactions
      ?.filter(tx => tx.created_at >= todayISO)
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0
    const revenueYesterdayFCFA = transactions
      ?.filter(tx => tx.created_at >= yesterdayISO && tx.created_at < todayISO)
      .reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0
    const totalCredits = transactions?.reduce((sum, tx) => sum + (tx.metadata?.activations || tx.amount || 0), 0) || 0

    // Activations stats
    const totalActivations = activations?.length || 0
    const activationsToday = activations?.filter(a => a.created_at >= todayISO).length || 0
    const activationsYesterday = activations?.filter(a => a.created_at >= yesterdayISO && a.created_at < todayISO).length || 0
    const pendingActivations = activations?.filter(a => ['pending', 'waiting'].includes(a.status)).length || 0
    const completedActivations = activations?.filter(a => ['received', 'completed'].includes(a.status)).length || 0
    const cancelledActivations = activations?.filter(a => a.status === 'cancelled').length || 0
    const successRate = totalActivations > 0 ? Math.round((completedActivations / totalActivations) * 100) : 0

    // SMS stats
    const smsReceived = activations?.filter(a => a.sms_code).length || 0
    const smsToday = activations?.filter(a => a.sms_code && a.created_at >= todayISO).length || 0

    return {
      totalUsers, newUsersToday, newUsersYesterday, activeUsers, usersWithBalance,
      totalRevenueFCFA, revenueTodayFCFA, revenueYesterdayFCFA, totalCredits,
      totalBalance, totalFrozen, totalAvailable,
      totalActivations, activationsToday, activationsYesterday,
      pendingActivations, completedActivations, cancelledActivations, successRate,
      activeRentals: activeRentals || 0, totalRentals: totalRentals || 0,
      smsReceived, smsToday
    }
  }

  // Calculate trend percentage
  const getTrend = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? '+100%' : '0%'
    const change = ((today - yesterday) / yesterday) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  const getTrendUp = (today: number, yesterday: number) => today >= yesterday

  // Format number with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return Math.floor(num).toString()
  }

  // Quick Actions pour navigation rapide
  const quickActions = [
    { label: 'Utilisateurs', path: '/admin/users', icon: Users, color: 'bg-blue-500' },
    { label: 'Recharges', path: '/admin/transactions', icon: CreditCard, color: 'bg-green-500' },
    { label: 'Activations', path: '/admin/activations', icon: Phone, color: 'bg-purple-500' },
    { label: 'Locations', path: '/admin/rentals', icon: Timer, color: 'bg-pink-500' },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, color: 'bg-orange-500' },
    { label: 'Monitoring', path: '/admin/monitoring', icon: Activity, color: 'bg-cyan-500' },
    { label: 'Paramètres', path: '/admin/settings', icon: Settings, color: 'bg-gray-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">Vue d'ensemble de One SMS - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* System Health Badge */}
          <Badge variant={
            systemHealth.status === 'healthy' ? 'default' :
            systemHealth.status === 'warning' ? 'secondary' : 'destructive'
          } className="flex items-center gap-1">
            {systemHealth.status === 'healthy' ? (
              <CheckCircle className="w-3 h-3" />
            ) : systemHealth.status === 'warning' ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {systemHealth.status === 'healthy' ? 'Système OK' : `${systemHealth.issues.length} alerte(s)`}
          </Badge>
          <Button onClick={() => refetchStats()} variant="outline" disabled={statsLoading}>
            {statsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Actualiser
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {systemHealth.issues.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">Alertes Système</h4>
                <ul className="text-sm text-yellow-600 dark:text-yellow-300 mt-1 space-y-1">
                  {systemHealth.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link key={action.path} to={action.path}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Main Stats Cards - Row 1: Revenue & Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Revenu Total</p>
                <h3 className="text-2xl font-bold mb-2">{formatNumber(stats.totalRevenueFCFA)} FCFA</h3>
                <div className="flex items-center text-sm">
                  {getTrendUp(stats.revenueTodayFCFA, stats.revenueYesterdayFCFA) ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={getTrendUp(stats.revenueTodayFCFA, stats.revenueYesterdayFCFA) ? 'text-green-500' : 'text-red-500'}>
                    {getTrend(stats.revenueTodayFCFA, stats.revenueYesterdayFCFA)}
                  </span>
                  <span className="text-muted-foreground ml-1">vs hier</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  📈 {formatNumber(stats.revenueTodayFCFA)} FCFA aujourd'hui • {formatNumber(stats.totalCredits)} crédits vendus
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Utilisateurs</p>
                <h3 className="text-2xl font-bold mb-2">{stats.totalUsers}</h3>
                <div className="flex items-center text-sm">
                  {getTrendUp(stats.newUsersToday, stats.newUsersYesterday) ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={getTrendUp(stats.newUsersToday, stats.newUsersYesterday) ? 'text-green-500' : 'text-red-500'}>
                    +{stats.newUsersToday}
                  </span>
                  <span className="text-muted-foreground ml-1">nouveaux aujourd'hui</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  👥 {stats.activeUsers} actifs • {stats.usersWithBalance} avec solde
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activations */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Activations</p>
                <h3 className="text-2xl font-bold mb-2">{stats.totalActivations}</h3>
                <div className="flex items-center text-sm">
                  {getTrendUp(stats.activationsToday, stats.activationsYesterday) ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={getTrendUp(stats.activationsToday, stats.activationsYesterday) ? 'text-green-500' : 'text-red-500'}>
                    {getTrend(stats.activationsToday, stats.activationsYesterday)}
                  </span>
                  <span className="text-muted-foreground ml-1">vs hier</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ✅ {stats.successRate}% réussite • ⏳ {stats.pendingActivations} en cours
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Received */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">SMS Reçus</p>
                <h3 className="text-2xl font-bold mb-2">{stats.smsReceived}</h3>
                <div className="flex items-center text-sm">
                  <Zap className="w-4 h-4 text-yellow-500 mr-1" />
                  <span className="text-yellow-500">+{stats.smsToday}</span>
                  <span className="text-muted-foreground ml-1">aujourd'hui</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  📱 {stats.activeRentals} location(s) active(s)
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2: Wallet & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde Total Utilisateurs</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalBalance)} Ⓐ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frozen Balance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg">
                <Snowflake className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Crédits Gelés</p>
                <p className="text-xl font-bold text-cyan-600">{formatNumber(stats.totalFrozen)} Ⓐ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de Réussite</p>
                <p className="text-xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Rentals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Timer className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locations Actives</p>
                <p className="text-xl font-bold">{stats.activeRentals} / {stats.totalRentals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals & Bonus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parrainages</p>
                <h3 className="text-2xl font-bold">{referralStats.total}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  🎯 {referralStats.qualified} qualifiés • 🏅 {referralStats.rewarded} récompensés
                </p>
                <p className="text-xs text-muted-foreground">
                  ⏳ {referralStats.pending} en attente • ❌ {referralStats.rejected} refusés • ⌛ {referralStats.expired} expirés
                </p>
              </div>
              <div className="bg-indigo-500 p-3 rounded-lg">
                <Gift className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bonus Parrainage</p>
                <p className="text-xl font-bold">{formatNumber(referralStats.bonusAmount)} FCFA</p>
                <p className="text-xs text-muted-foreground mt-1">{referralStats.bonusCount} transaction(s) validées</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={referralLoading} onClick={() => refetchReferrals()}>
                  {referralLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Maj
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activations Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completedActivations}</p>
            <p className="text-sm text-green-600">Réussies</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.pendingActivations}</p>
            <p className="text-sm text-yellow-600">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.cancelledActivations}</p>
            <p className="text-sm text-red-600">Annulées</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.activationsToday}</p>
            <p className="text-sm text-blue-600">Aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Transactions & Activations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
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
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune recharge</p>
              ) : recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      tx.status === 'completed' ? 'bg-green-500' : 
                      tx.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{tx.user?.email?.split('@')[0] || 'Anonyme'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      +{formatNumber(tx.metadata?.amount_xof || tx.amount * 100)} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.metadata?.activations || tx.amount} crédits
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activations */}
        <Card>
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
            <div className="space-y-3">
              {recentActivations.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune activation</p>
              ) : recentActivations.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      a.status === 'received' || a.status === 'completed' ? 'default' :
                      a.status === 'pending' || a.status === 'waiting' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {a.status === 'received' || a.status === 'completed' ? '✅' :
                       a.status === 'pending' || a.status === 'waiting' ? '⏳' : '❌'}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{a.service_code?.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{a.country_code?.toUpperCase()} • {a.phone?.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{a.price} Ⓐ</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Nouveaux Utilisateurs
          </CardTitle>
          <Link to="/admin/users" className="text-primary hover:underline text-sm flex items-center gap-1">
            Voir tout <ArrowUpRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Solde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Gelé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Aucun utilisateur</td></tr>
              ) : recentUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{user.email}</td>
                  <td className="px-6 py-4 text-sm">{user.name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">{Math.floor(user.balance || 0)} Ⓐ</td>
                  <td className="px-6 py-4 text-sm">
                    {(user.frozen_balance || 0) > 0 ? (
                      <span className="text-cyan-600">{Math.floor(user.frozen_balance)} Ⓐ</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={
                      user.role === 'banned' ? 'destructive' :
                      user.role === 'admin' ? 'default' : 'secondary'
                    }>
                      {user.role === 'banned' ? '🚫 Banni' : user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
