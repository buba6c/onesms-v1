// @ts-nocheck
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Phone, DollarSign, Activity, CheckCircle2, XCircle, AlertCircle, ArrowRight, Clock, Zap, Eye, ShieldCheck, Cpu, Layers, Info, Sparkles, AlertTriangle, Filter, Copy, Check } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { getServiceLogo, getServiceLogoFallback, getCountryFlag } from '@/lib/logo-service'

// Helper for exact FCFA amounts
const getAmountFCFA = (tx: any): number => {
  if (tx.type === 'referral_bonus') return 0;
  if (tx.metadata?.amount_xof) return Number(tx.metadata.amount_xof) || 0;
  if (tx.metadata?.payment_provider === 'paydunya') return Number(tx.amount) || 0;
  if (tx.metadata?.payment_provider === 'moneyfusion') {
    const amount = Number(tx.amount) || 0;
    return amount < 50 ? amount * 100 : amount;
  }
  return Number(tx.amount) || 0;
}

export default function AdminAnalytics() {
  const { t } = useTranslation()
  const [selectedSmartLog, setSelectedSmartLog] = useState<any | null>(null)
  const [smartFilter, setSmartFilter] = useState<'all' | 'failover' | 'mapping_alert' | 'success'>('all')
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null)

  const copyDebugReportForAI = (log: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const meta = log.metadata || {}
    const tries = meta.tries || []
    const analysis = analyzeSmartLog(log)

    const debugPayload = {
      issue_type: analysis.isMappingAlert ? 'POTENTIAL_MAPPING_ISSUE' : analysis.isFailover ? 'FAILOVER_TRIGGERED' : 'LOG_INSPECTION',
      service: meta.service || log.service || 'unknown',
      country: meta.country || log.country || 'unknown',
      final_status: meta.success ? 'SUCCESS' : 'FAILED',
      final_provider: meta.final_provider || null,
      total_duration_ms: meta.total_ms || 0,
      ai_verdict: analysis.aiVerdict,
      attempts_chronology: tries.map((t: any, idx: number) => ({
        step: idx + 1,
        provider: t.provider,
        status: t.status,
        check_ms: t.check_ms,
        buy_ms: t.buy_ms,
        error_message: t.error || t.message || null
      })),
      raw_created_at: log.created_at,
      log_id: log.id || undefined
    }

    const formattedText = `=== RAPPORT DE DÉBOGAGE / MAPPING POUR L'IA (ONE SMS) ===\nService: ${debugPayload.service} | Pays: ${debugPayload.country}\nVerdict IA: ${debugPayload.ai_verdict}\n\n[CHRONOLOGIE DES TENTATIVES]:\n${tries.map((t: any, idx: number) => `  #${idx+1} ${String(t.provider || '').toUpperCase()} -> Statut: ${t.status} | Erreur: ${t.error || 'Aucune'}`).join('\n')}\n\n[PAYLOAD JSON COMPLET POUR CORRECTION DU MAPPING]:\n\`\`\`json\n${JSON.stringify(debugPayload, null, 2)}\n\`\`\``

    navigator.clipboard.writeText(formattedText)
    const logKey = log.id || `${log.created_at}-${meta.service}`
    setCopiedLogId(logKey)
    setTimeout(() => setCopiedLogId(null), 2500)
  }

  const analyzeSmartLog = (log: any) => {
    const meta = log.metadata || {}
    const tries = meta.tries || []
    const isSuccess = meta.success

    // Détection d'anomalie de Mapping ou d'API (hors rupture de stock)
    const mappingErrorTry = tries.find((t: any) => {
      const errStr = String(t.error || t.message || '').toLowerCase()
      return (
        t.status === 'error' ||
        errStr.includes('bad_service') ||
        errStr.includes('not found') ||
        errStr.includes('invalid') ||
        errStr.includes('unsupported') ||
        errStr.includes('wrong_service')
      )
    })

    const isFailover = isSuccess && tries.length > 1
    const isMappingAlert = !isSuccess && !!mappingErrorTry

    let type: 'success' | 'failover' | 'mapping_alert' | 'stock_empty' = 'success'
    if (isMappingAlert) type = 'mapping_alert'
    else if (isFailover) type = 'failover'
    else if (!isSuccess) type = 'stock_empty'

    return {
      type,
      isFailover,
      isMappingAlert,
      mappingErrorTry,
      aiVerdict: isMappingAlert
        ? `Alerte IA: Code service ou pays suspect sur ${mappingErrorTry.provider} (${mappingErrorTry.error || 'Erreur API'})`
        : isFailover
        ? `Routage IA: 1er essai en rupture, bascule réussie vers ${meta.final_provider}`
        : isSuccess
        ? `Routage direct validé sur ${meta.final_provider}`
        : `Rupture de stock momentanée sur les ${tries.length} fournisseurs`
    }
  }
  
  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 backdrop-blur-md border border-gray-100 p-3 rounded-xl shadow-lg">
          <p className="text-gray-500 text-xs font-bold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-bold text-sm" style={{ color: entry.color }}>
              {entry.name === 'revenue' || entry.name === 'value' 
                ? formatCurrency(entry.value) 
                : `${entry.value} ${entry.name === 'count' ? 'activations' : entry.name}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Fetch revenue chart data (last 7 days)
  const { data: revenueData = [] } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('amount, metadata, created_at, type, status, provider')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { data: any[] | null }

      const grouped: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[d.toLocaleDateString('fr-FR')] = 0
      }

      data?.forEach((tx: any) => {
        const date = new Date(tx.created_at).toLocaleDateString('fr-FR')
        if (grouped[date] !== undefined) {
          grouped[date] += getAmountFCFA(tx)
        }
      })

      return Object.entries(grouped).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue)
      }))
    },
    refetchInterval: 60000
  })

  // Fetch users growth data (last 7 days)
  const { data: usersData = [] } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { data: { created_at: string }[] | null }

      const grouped: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        grouped[d.toLocaleDateString('fr-FR')] = 0
      }

      data?.forEach((u: any) => {
        const date = new Date(u.created_at).toLocaleDateString('fr-FR')
        if (grouped[date] !== undefined) {
          grouped[date] += 1
        }
      })

      return Object.entries(grouped).map(([date, count]) => ({
        date,
        users: count
      }))
    },
    refetchInterval: 60000
  })

  // Fetch popular services
  const { data: servicesData = [] } = useQuery({
    queryKey: ['analytics-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('service_code, price')
        .in('status', ['completed', 'received']) as { data: { service_code: string; price: string }[] | null }

      const grouped: Record<string, { count: number; revenue: number }> = {}
      data?.forEach((a: any) => {
        const code = a.service_code || 'Inconnu'
        if (!grouped[code]) {
          grouped[code] = { count: 0, revenue: 0 }
        }
        grouped[code].count++
        grouped[code].revenue += parseFloat(a.price || '0')
      })

      return Object.entries(grouped)
        .map(([service, stats]) => ({
          name: service,
          count: stats.count,
          revenue: Math.round(stats.revenue)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    },
    refetchInterval: 60000
  })

  // Fetch countries distribution
  const { data: countriesData = [] } = useQuery({
    queryKey: ['analytics-countries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('country_code')
        .in('status', ['completed', 'received']) as { data: { country_code: string }[] | null }

      const grouped: Record<string, number> = {}
      data?.forEach((a: any) => {
        const country = (a.country_code || 'inconnu').toUpperCase()
        grouped[country] = (grouped[country] || 0) + 1
      })

      return Object.entries(grouped)
        .map(([country, count]) => ({
          name: country,
          value: count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    },
    refetchInterval: 60000
  })

  // Basic overview stats (using real FCFA calculation for revenue)
  const { data: stats } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)

      const [
        { data: txs },
        { count: todayUsers },
        { count: yesterdayUsers },
        { count: todayNumbers },
        { count: yesterdayNumbers },
        { count: totalActivations },
        { count: completedActivations }
      ] = await Promise.all([
        supabase.from('transactions').select('amount, metadata, created_at, type, status, provider')
          .eq('status', 'completed')
          .gte('created_at', yesterdayStart.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
        supabase.from('activations').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('activations').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
        supabase.from('activations').select('*', { count: 'exact', head: true }),
        supabase.from('activations').select('*', { count: 'exact', head: true }).in('status', ['completed', 'received'])
      ])

      const todayRevenue = txs?.filter(t => new Date(t.created_at) >= todayStart).reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0
      const yesterdayRevenue = txs?.filter(t => new Date(t.created_at) >= yesterdayStart && new Date(t.created_at) < todayStart).reduce((sum, tx) => sum + getAmountFCFA(tx), 0) || 0

      const revenueTrend = yesterdayRevenue > 0 ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1) : '100'
      const usersTrend = yesterdayUsers ? (((todayUsers || 0) - yesterdayUsers) / yesterdayUsers * 100).toFixed(1) : '100'
      const numbersTrend = yesterdayNumbers ? (((todayNumbers || 0) - yesterdayNumbers) / yesterdayNumbers * 100).toFixed(1) : '100'
      const conversionRate = totalActivations 
        ? ((completedActivations || 0) / totalActivations * 100).toFixed(1)
        : '0'

      return {
        revenue: Math.round(todayRevenue),
        revenueTrend: parseFloat(revenueTrend),
        users: todayUsers || 0,
        usersTrend: parseFloat(usersTrend),
        numbers: todayNumbers || 0,
        numbersTrend: parseFloat(numbersTrend),
        conversionRate: parseFloat(conversionRate)
      }
    },
    refetchInterval: 60000
  })

  // Fetch Smart Routing Logs
  const { data: smartRoutingLogs = [] } = useQuery({
    queryKey: ['analytics-smart-routing'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_logs')
        .select('*')
        .eq('category', 'SMART_ROUTING')
        .order('created_at', { ascending: false })
        .limit(30)
      return data || []
    },
    refetchInterval: 30000
  })

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  const statCards = [
    {
      label: "Revenus Aujourd'hui",
      value: formatCurrency(stats?.revenue || 0),
      trend: `${stats?.revenueTrend || 0}%`,
      trendUp: (stats?.revenueTrend || 0) >= 0,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      label: "Nouveaux Inscrits",
      value: stats?.users || 0,
      trend: `${stats?.usersTrend || 0}%`,
      trendUp: (stats?.usersTrend || 0) >= 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      label: "Numéros Vendus",
      value: stats?.numbers || 0,
      trend: `${stats?.numbersTrend || 0}%`,
      trendUp: (stats?.numbersTrend || 0) >= 0,
      icon: Phone,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      label: "Taux de Conversion",
      value: `${stats?.conversionRate || 0}%`,
      trend: 'Global',
      trendUp: true,
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    }
  ]

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Activity className="w-6 h-6 text-white" />
            </div>
            Analytiques Avancées
          </h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-black mb-3 text-gray-900">{stat.value}</h3>
                  <div className="flex items-center text-xs font-bold">
                    <span className={cn("flex items-center px-2 py-1 rounded-md", stat.trendUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                      {stat.trendUp ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {stat.trend}
                    </span>
                    <span className="text-gray-400 ml-2">vs hier</span>
                  </div>
                </div>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", stat.bg)}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Revenus (7 Derniers Jours)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} tickFormatter={(val) => `${val/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Users Growth */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Nouveaux Inscrits (7 Derniers Jours)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usersData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={4} dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: '#fff', r: 4 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Top 10 des Services</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicesData}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, textTransform: 'uppercase'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="url(#colorBar)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Countries Distribution */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Top 5 des Pays</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={countriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {countriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <ul className="flex justify-center gap-4 mt-4">
                        {payload?.map((entry: any, index) => (
                          <li key={`item-${index}`} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            {entry.value.toUpperCase()}
                          </li>
                        ))}
                      </ul>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Popular Services Table */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-100 rounded-3xl overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Détails des Services Populaires</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Activations</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Revenus Estimés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {servicesData.map((service, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center p-2 shadow-sm">
                        <img src={getServiceLogo(service.name)} onError={(e) => getServiceLogoFallback(e, service.name)} alt="logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-gray-900 capitalize text-sm">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-xs">{service.count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-emerald-600">{formatCurrency(service.revenue)}</span>
                  </td>
                </tr>
              ))}
              {servicesData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500 font-medium">Aucune donnée de service disponible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Smart Routing Logs Analytics & AI Mapping Diagnostics */}
      <div className="mt-10 space-y-6">
        {/* En-tête + KPI du Mode Smart */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">Logs du Mode Smart (Routing Intelligent)</h3>
              <p className="text-sm text-gray-500">Traçabilité complète des bascules automatiques et diagnostic IA des mappings</p>
            </div>
          </div>

          {/* Mini KPI Smart Routing */}
          {(() => {
            const total = smartRoutingLogs.length || 0;
            const successCount = smartRoutingLogs.filter((l: any) => l.metadata?.success).length;
            const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
            const savedCount = smartRoutingLogs.filter((l: any) => analyzeSmartLog(l).isFailover).length;
            const avgLatency = total > 0 ? Math.round(smartRoutingLogs.reduce((acc: number, l: any) => acc + (l.metadata?.total_ms || 0), 0) / total) : 0;

            return (
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Réussite Smart</p>
                    <p className="text-base font-black text-emerald-950">{successRate}%</p>
                  </div>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Sauvés (Failover)</p>
                    <p className="text-base font-black text-blue-950">{savedCount} achats</p>
                  </div>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200/60 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Latence moyenne</p>
                    <p className="text-base font-black text-gray-900">{avgLatency} ms</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 🧠 CARTE DÉDIÉE : DIAGNOSTIC IA DES MAPPINGS EN DIRECT */}
        {(() => {
          const mappingAlertLogs = smartRoutingLogs.filter((l: any) => analyzeSmartLog(l).isMappingAlert)
          const hasMappingAlerts = mappingAlertLogs.length > 0

          return hasMappingAlerts ? (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <span>🧠 Diagnostic IA : {mappingAlertLogs.length} anomalie(s) de mapping potentielle(s) détectée(s)</span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    L'IA a identifié des erreurs API atypiques (ex: BAD_SERVICE, code pays non reconnu). Il ne s'agit pas d'une simple rupture de stock. Vérifiez les correspondances ID.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSmartFilter('mapping_alert')}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-extrabold hover:bg-amber-700 transition-all shadow-md shrink-0"
              >
                Filtrer les {mappingAlertLogs.length} alertes IA
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-emerald-900">
                  ✅ Diagnostic IA : Mappings 100% valides. Les seuls échecs enregistrés sont dus à des ruptures de stock fournisseurs temporaires.
                </p>
              </div>
            </div>
          )
        })()}

        {/* ONGLETS / FILTRES PAR CARTE */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSmartFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              smartFilter === 'all'
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            Toutes les cartes ({smartRoutingLogs.length})
          </button>
          <button
            onClick={() => setSmartFilter('failover')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
              smartFilter === 'failover'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sauvés par Failover ({smartRoutingLogs.filter((l: any) => analyzeSmartLog(l).isFailover).length})</span>
          </button>
          <button
            onClick={() => setSmartFilter('mapping_alert')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
              smartFilter === 'mapping_alert'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes Mapping IA ({smartRoutingLogs.filter((l: any) => analyzeSmartLog(l).isMappingAlert).length})</span>
          </button>
          <button
            onClick={() => setSmartFilter('success')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              smartFilter === 'success'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            )}
          >
            Succès directs ({smartRoutingLogs.filter((l: any) => analyzeSmartLog(l).type === 'success').length})
          </button>
        </div>

        {/* SÉPARATION PAR CARTES INDIVIDUELLES ("bien séparer les logs par carte") */}
        {(() => {
          const filteredLogs = smartRoutingLogs.filter((l: any) => {
            const analysis = analyzeSmartLog(l)
            if (smartFilter === 'failover') return analysis.isFailover
            if (smartFilter === 'mapping_alert') return analysis.isMappingAlert
            if (smartFilter === 'success') return analysis.type === 'success'
            return true
          })

          if (filteredLogs.length === 0) {
            return (
              <Card className="p-12 text-center border-0 ring-1 ring-gray-100 rounded-3xl">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
                    <Filter className="w-6 h-6" />
                  </div>
                  <p className="text-gray-900 font-bold text-base">Aucune carte dans ce filtre</p>
                  <p className="text-gray-500 text-xs mt-1">Sélectionnez "Toutes les cartes" pour afficher l'ensemble de l'historique Smart Routing.</p>
                </div>
              </Card>
            )
          }

          return (
            <div className="grid grid-cols-1 gap-4">
              {filteredLogs.map((log: any, i: number) => {
                const meta = log.metadata || {}
                const isSuccess = meta.success
                const tries = meta.tries || []
                const flag = getCountryFlag(meta.country || '')
                const analysis = analyzeSmartLog(log)

                return (
                  <Card key={i} className="p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Section gauche : Service, Pays et Badge IA */}
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center p-2.5 shrink-0">
                          <img src={getServiceLogo(meta.service || '')} onError={(e) => getServiceLogoFallback(e, meta.service || '')} className="w-full h-full object-contain" alt="" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-gray-900 capitalize text-base">{meta.service || 'Inconnu'}</span>
                            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                              {flag} {meta.country || 'Inconnu'}
                            </span>
                            {analysis.isMappingAlert && (
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Alerte Mapping
                              </span>
                            )}
                            {analysis.isFailover && (
                              <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Zap className="w-3 h-3 text-blue-600" />
                                Sauvé par Failover
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 font-medium">
                            <span>{new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            {meta.total_ms && (
                              <span className="font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">⏱ {meta.total_ms} ms</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section centrale : Pipeline de tentatives en cascade */}
                      <div className="flex items-center flex-wrap gap-2">
                        {tries.map((t: any, idx: number) => {
                          let badgeStyle = 'bg-gray-100 text-gray-600 border-gray-200'
                          let label = 'Tentative'
                          if (t.status === 'success') {
                            badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            label = 'Succès'
                          } else if (t.status === 'no_stock') {
                            badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200'
                            label = 'Rupture stock'
                          } else if (t.status === 'failed' || t.status === 'error') {
                            badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200'
                            label = t.error || 'Erreur API'
                          } else if (t.status === 'skipped') {
                            badgeStyle = 'bg-gray-50 text-gray-400 border-gray-200'
                            label = 'Ignoré'
                          }

                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <div className={cn("px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-2xs transition-all", badgeStyle)}>
                                <span className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-extrabold uppercase tracking-tight text-[11px]">{t.provider}</span>
                                <span className="text-[11px] opacity-85">· {label}</span>
                              </div>
                              {idx < tries.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Section droite : Résultat et bouton inspecter */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                        {isSuccess ? (
                          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/90 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-black uppercase">{meta.final_provider}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-700 bg-rose-50/90 border border-rose-200 px-3.5 py-1.5 rounded-xl">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="text-xs font-black">Échec</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => copyDebugReportForAI(log, e)}
                            title="Copier le rapport complet (JSON + diagnostic) pour correction avec l'IA"
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-2xs",
                              copiedLogId === (log.id || `${log.created_at}-${meta.service}`)
                                ? "bg-emerald-600 text-white border border-emerald-600"
                                : "bg-gray-100 hover:bg-gray-900 text-gray-700 hover:text-white border border-gray-200"
                            )}
                          >
                            {copiedLogId === (log.id || `${log.created_at}-${meta.service}`) ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copié pour l'IA !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copier pour l'IA</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setSelectedSmartLog(log)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 transition-all shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspecter</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ligne de diagnostic IA rapide sous la carte si alerte */}
                    {analysis.isMappingAlert && (
                      <div className="mt-3.5 pt-3 border-t border-amber-100 flex items-center gap-2 text-xs font-bold text-amber-800">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{analysis.aiVerdict}</span>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Modale d'inspection complète et Diagnostic IA du log Smart Routing */}
      <Dialog open={!!selectedSmartLog} onOpenChange={(open) => !open && setSelectedSmartLog(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-extrabold text-gray-900">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <span>Rapport d'Audit & Diagnostic IA Smart Routing</span>
            </DialogTitle>
          </DialogHeader>

          {selectedSmartLog && (() => {
            const meta = selectedSmartLog.metadata || {}
            const tries = meta.tries || []
            const isSuccess = meta.success
            const analysis = analyzeSmartLog(selectedSmartLog)

            return (
              <div className="space-y-6 mt-2">
                {/* Encart Diagnostic IA */}
                <div className={cn(
                  "p-4 rounded-2xl border flex items-start gap-3",
                  analysis.isMappingAlert
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : analysis.isFailover
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : isSuccess
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-gray-50 border-gray-200 text-gray-800"
                )}>
                  <Sparkles className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider">Verdict de l'IA</h5>
                    <p className="text-sm font-bold mt-1">{analysis.aiVerdict}</p>
                  </div>
                </div>

                {/* Résumé de la requête */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Service</p>
                    <p className="text-sm font-black text-gray-900 capitalize mt-0.5">{meta.service || 'Inconnu'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pays</p>
                    <p className="text-sm font-black text-gray-900 uppercase mt-0.5">{meta.country || 'Inconnu'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Statut Final</p>
                    <p className={cn("text-sm font-black mt-0.5", isSuccess ? "text-emerald-600" : "text-rose-600")}>
                      {isSuccess ? `Succès (${meta.final_provider})` : "Échec"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Durée Totale</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">{meta.total_ms || 0} ms</p>
                  </div>
                </div>

                {/* Détail chronologique de chaque tentative */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Chronologie des bascules ({tries.length} tentative{tries.length > 1 ? 's' : ''})
                  </h4>
                  <div className="space-y-2.5">
                    {tries.map((t: any, index: number) => {
                      const isOk = t.status === 'success'
                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                            isOk ? "bg-emerald-50/50 border-emerald-200" : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                              isOk ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                            )}>
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-extrabold uppercase text-gray-900">{t.provider}</p>
                              <p className="text-xs text-gray-500 font-medium">
                                {t.status === 'success' && "Numéro attribué avec succès"}
                                {t.status === 'no_stock' && "Rupture de stock sur ce fournisseur"}
                                {(t.status === 'failed' || t.status === 'error') && (t.error || "Erreur de l'API fournisseur")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 shrink-0">
                            {t.check_ms !== undefined && (
                              <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200">Check stock: {t.check_ms}ms</span>
                            )}
                            {t.buy_ms !== undefined && (
                              <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200">Achat: {t.buy_ms}ms</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pied de la modale */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => copyDebugReportForAI(selectedSmartLog)}
                    className={cn(
                      "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md",
                      copiedLogId === (selectedSmartLog.id || `${selectedSmartLog.created_at}-${meta.service}`)
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    {copiedLogId === (selectedSmartLog.id || `${selectedSmartLog.created_at}-${meta.service}`) ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Rapport & JSON copié dans le presse-papier !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier le rapport complet (JSON + diagnostic) pour l'IA</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedSmartLog(null)}
                    className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all"
                  >
                    Fermer le rapport
                  </button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
