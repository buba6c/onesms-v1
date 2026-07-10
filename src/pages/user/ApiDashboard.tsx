// @ts-nocheck
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Custom Pro SVGs
const SvgKey = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 8C17.7614 8 20 10.2386 20 13C20 15.7614 17.7614 18 15 18C12.9818 18 11.242 16.7997 10.4578 15.0001L4 15.0001C3.44772 15.0001 3 14.5524 3 14.0001V12.0001C3 11.4478 3.44772 11.0001 4 11.0001H10.4578C11.242 9.20046 12.9818 8 15 8Z" fill="url(#paint0_linear)" fillOpacity="0.2"/>
    <path d="M15 14.5C15.8284 14.5 16.5 13.8284 16.5 13C16.5 12.1716 15.8284 11.5 15 11.5C14.1716 11.5 13.5 12.1716 13.5 13C13.5 13.8284 14.1716 14.5 15 14.5Z" fill="url(#paint0_linear)"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M15 6C11.134 6 8 9.13401 8 13V13.0001H5.5L5 13.5001L5 15.5001L5.5 16.0001H6.5L7 15.5001V15.0001H8.38197C9.30398 17.3486 11.9546 19 15 19C18.866 19 22 15.866 22 12.5C22 9.13401 18.866 6 15 6ZM15 8C17.7614 8 20 10.2386 20 12.5C20 14.7614 17.7614 17 15 17C12.8711 17 11.0967 15.4851 10.6053 13.5001H4C3.44772 13.5001 3 13.0524 3 12.5001V10.5001C3 9.94782 3.44772 9.50011 4 9.50011H10.6053C11.0967 7.51515 12.8711 6 15 6ZM15 14C15.8284 14 16.5 13.3284 16.5 12.5C16.5 11.6716 15.8284 11 15 11C14.1716 11 13.5 11.6716 13.5 12.5C13.5 13.3284 14.1716 14 15 14Z" fill="url(#paint0_linear)"/>
    <defs>
      <linearGradient id="paint0_linear" x1="3" y1="6" x2="22" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
  </svg>
)

const SvgActivity = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12H7.5L10 6L14 18L16.5 12H20" stroke="url(#activityGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="activityGrad" x1="4" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
)

const SvgLightning = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#lightningGrad)" fillOpacity="0.2" stroke="url(#lightningGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="lightningGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#EF4444" />
      </linearGradient>
    </defs>
  </svg>
)

const SvgWallet = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7" stroke="url(#walletGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 7C20 5.89543 19.1046 5 18 5H6C4.89543 5 4 5.89543 4 7C4 8.10457 4.89543 9 6 9H18C19.1046 9 20 8.10457 20 7Z" fill="url(#walletGrad)" fillOpacity="0.15" stroke="url(#walletGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 11H20" stroke="url(#walletGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 15H20" stroke="url(#walletGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="walletGrad" x1="4" y1="5" x2="20" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
)

const SvgTag = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5858 2.58579C12.2107 2.21071 11.702 2 11.1716 2H4C2.89543 2 2 2.89543 2 4V11.1716C2 11.702 2.21071 12.2107 2.58579 12.5858L12.5858 22.5858C13.3668 23.3668 14.6332 23.3668 15.4142 22.5858L22.5858 15.4142C23.3668 14.6332 23.3668 13.3668 22.5858 12.5858L12.5858 2.58579Z" fill="url(#tagGrad)" fillOpacity="0.15" stroke="url(#tagGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7.5C7.27614 7.5 7.5 7.27614 7.5 7C7.5 6.72386 7.27614 6.5 7 6.5C6.72386 6.5 6.5 6.72386 6.5 7C6.5 7.27614 6.72386 7.5 7 7.5Z" fill="url(#tagGrad)" stroke="url(#tagGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="tagGrad" x1="2" y1="2" x2="23" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EC4899" />
        <stop offset="1" stopColor="#BE185D" />
      </linearGradient>
    </defs>
  </svg>
)

const SvgBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5C4 18.6716 4.67157 18 5.5 18H21" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 4.5C4 3.67157 4.67157 3 5.5 3H19C19.5523 3 20 3.44772 20 4V19C20 19.5523 19.5523 20 19 20H5.5C4.67157 20 4 19.3284 4 18.5V4.5Z" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 7V13" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10H15" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SvgEye = ({ off = false }: { off?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
)

const SvgCopy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const SvgRefresh = ({ className = "" }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

export default function ApiDashboard() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore(state => state.user)
  
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyData, setKeyData] = useState<any>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [label, setLabel] = useState('')
  const [editingLabel, setEditingLabel] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [editingWebhook, setEditingWebhook] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [stats, setStats] = useState({
    totalRequests: 0,
    lastUsed: null as string | null,
    totalSpentApi: 0,
    totalActivations: 0,
    discountRate: 0
  })

  useEffect(() => {
    if (user) {
      fetchApiKey()
      fetchStats()
    }
  }, [user])

  const fetchApiKey = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key, label, request_count, last_used_at, created_at, is_active, webhook_url, webhook_secret')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setApiKey(data.key)
        setKeyData(data)
        setLabel(data.label || '')
        setWebhookUrl(data.webhook_url || '')
        setWebhookSecret(data.webhook_secret || '')
      }
    } catch (error: any) {
      console.error('Error fetching API key:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('api_discount_rate')
        .eq('id', user?.id)
        .single()

      const { data: activations } = await (supabase as any)
        .from('activations')
        .select('price, status, charged')
        .eq('user_id', user?.id)
        .eq('source', 'api')

      const totalSpent = (activations || [])
        .filter((a: any) => a.charged === true)
        .reduce((sum: number, a: any) => sum + (parseFloat(a.price) || 0), 0)

      setStats({
        totalRequests: 0,
        lastUsed: null,
        totalSpentApi: Math.floor(totalSpent),
        totalActivations: (activations || []).length,
        discountRate: userData?.api_discount_rate || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const generateNewKey = async () => {
    setGenerating(true)
    try {
      if (apiKey) {
        await supabase.from('api_keys').update({ is_active: false }).eq('user_id', user?.id)
      }

      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      const newKey = 'onesms_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

      const { error } = await supabase.from('api_keys')// @ts-ignore
      .insert({
        user_id: user?.id,
        key: newKey,
        is_active: true,
        label: label || null
      })

      if (error) throw error

      setApiKey(newKey)
      setShowKey(true)
      fetchApiKey()
      toast({ title: t('apiDashboard.toastSuccess', 'Succès'), description: t('apiDashboard.toastGenSuccess', 'Nouvelle clé API générée avec succès') })
    } catch (error: any) {
      toast({ title: t('apiDashboard.toastError', 'Erreur'), description: error.message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const updateLabel = async () => {
    if (!keyData) return
    try {
      await supabase.from('api_keys').update({ label }).eq('id', keyData.id)
      setEditingLabel(false)
      toast({ title: t('apiDashboard.toastSuccess', 'Succès'), description: t('apiDashboard.toastLabelUpdated', 'Nom de la clé mis à jour') })
    } catch (error: any) {
      toast({ title: t('apiDashboard.toastError', 'Erreur'), description: error.message, variant: 'destructive' })
    }
  }

  const saveWebhook = async () => {
    if (!keyData) return
    setSavingWebhook(true)
    try {
      await supabase.from('api_keys').update({ webhook_url: webhookUrl || null, webhook_secret: webhookSecret || null }).eq('id', keyData.id)
      setEditingWebhook(false)
      fetchApiKey()
      toast({ title: t('apiDashboard.toastSuccess', 'Succès'), description: t('apiDashboard.toastWebhookUpdated', 'Configuration Webhook mise à jour') })
    } catch (error: any) {
      toast({ title: t('apiDashboard.toastError', 'Erreur'), description: error.message, variant: 'destructive' })
    } finally {
      setSavingWebhook(false)
    }
  }

  const copyToClipboard = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    toast({ title: t('apiDashboard.toastCopied', 'Copié !'), description: t('apiDashboard.toastKeyCopied', 'La clé API a été copiée dans le presse-papier') })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 font-sans">
      
      {/* HEADER HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{t('apiDashboard.heroTitle', 'Espace')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('apiDashboard.heroTitleGradient', 'Développeur')}</span></h1>
            <p className="text-slate-500 mt-2 text-lg font-medium max-w-lg">
              {t('apiDashboard.heroDesc', "L'infrastructure SMS la plus puissante. Automatisez vos activations avec une API REST ultra-rapide.")}
            </p>
          </div>
          <Link to="/api-docs">
            <button className="group flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <SvgBook />
              {t('apiDashboard.docBtn', 'Documentation API')}
            </button>
          </Link>
        </div>
      </div>

      {/* STATS WIDGETS */}
      {apiKey && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100/50">
                <SvgActivity />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('apiDashboard.statReq', 'Requêtes API')}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{keyData?.request_count || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-red-50 flex items-center justify-center border border-amber-100/50">
                <SvgLightning />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('apiDashboard.statAct', 'Activations')}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalActivations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border border-emerald-100/50">
                <SvgWallet />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('apiDashboard.statSpent', 'Dépensé via API')}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalSpentApi} <span className="text-lg font-bold text-slate-400">Ⓐ</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 relative overflow-hidden">
            {stats.discountRate > 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full blur-2xl -mt-10 -mr-10"></div>}
            <div className="flex flex-col gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center border border-pink-100/50">
                <SvgTag />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('apiDashboard.statDiscount', 'Réduction API')}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stats.discountRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAIN API KEY SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <SvgKey />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('apiDashboard.authTitle', 'Authentification API')}</h2>
                <p className="text-slate-500 font-medium text-sm mt-0.5">{t('apiDashboard.authSubtitle', 'Votre clé secrète pour signer les requêtes.')}</p>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/50">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : apiKey ? (
                <div className="space-y-6">
                  {/* LABEL EDITOR */}
                  <div className="flex items-center gap-3">
                    {editingLabel ? (
                      <div className="flex items-center gap-2 flex-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <input
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder={t('apiDashboard.labelPlaceholder', 'Nommez cette clé (ex: Serveur Prod)')}
                          className="flex-1 bg-transparent px-3 py-2 outline-none font-medium text-slate-700"
                          autoFocus
                        />
                        <button onClick={updateLabel} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800">
                          {t('apiDashboard.btnOk', 'OK')}
                        </button>
                        <button onClick={() => setEditingLabel(false)} className="text-slate-400 hover:text-slate-600 px-3">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingLabel(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-600 transition-colors shadow-sm"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {label || t('apiDashboard.addLabel', 'Ajouter un label personnalisé...')}
                      </button>
                    )}
                  </div>

                  {/* KEY TERMINAL */}
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center justify-between p-1 bg-[#0a0a0a] rounded-xl shadow-2xl border border-white/10">
                      <div className="flex-1 overflow-x-auto no-scrollbar pl-4 pr-2 py-4">
                        <code className="text-emerald-400 font-mono text-lg tracking-wider whitespace-nowrap">
                          {showKey ? apiKey : 'onesms_' + '•'.repeat(40)}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 pr-2 pl-2 border-l border-white/10">
                        <button 
                          onClick={() => setShowKey(!showKey)}
                          className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title={t('apiDashboard.revealKey', 'Révéler la clé')}
                        >
                          <SvgEye off={!showKey} />
                        </button>
                        <button 
                          onClick={copyToClipboard}
                          className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title={t('apiDashboard.copyKey', 'Copier')}
                        >
                          <SvgCopy />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm font-medium text-slate-400">
                      {t('apiDashboard.lastUsed', 'Dernier appel :')} <span className="text-slate-600">{keyData?.last_used_at ? new Date(keyData.last_used_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'fr-FR') : t('apiDashboard.never', 'Jamais')}</span>
                    </p>
                    <button 
                      onClick={generateNewKey} 
                      disabled={generating}
                      className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                    >
                      <SvgRefresh className={generating ? "animate-spin" : ""} />
                      {generating ? t('apiDashboard.revoking', 'Révocation...') : t('apiDashboard.revokeGen', 'Révoquer & Régénérer')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                    <SvgKey />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{t('apiDashboard.noKeyTitle', 'Aucune clé active')}</h3>
                  <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
                    {t('apiDashboard.noKeyDesc', "Générez votre première clé secrète pour commencer à interagir avec l'API ONE SMS.")}
                  </p>
                  <button 
                    onClick={generateNewKey} 
                    disabled={generating} 
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5"
                  >
                    {generating ? t('apiDashboard.genKeyLoading', 'Génération en cours...') : t('apiDashboard.genKeyBtn', 'Générer ma clé API')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
                    {/* WEBHOOK SECTION */}
          {apiKey && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mt-6">
              <div className="p-6 md:p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t('apiDashboard.webhookTitle', 'Webhooks B2B (Facultatif)')}</h2>
                  <p className="text-slate-500 font-medium text-sm mt-0.5">{t('apiDashboard.webhookSubtitle', 'Recevez les codes SMS sur votre propre serveur au lieu de faire du Polling.')}</p>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50">
                {editingWebhook ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">{t('apiDashboard.webhookUrlLabel', 'URL du Webhook')}</label>
                      <input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://votre-serveur.com/api/onesms-webhook"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">{t('apiDashboard.webhookSecretLabel', 'Jeton Secret (Optionnel)')}</label>
                      <input
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="Un mot de passe pour signer les requêtes (X-OneSMS-Signature)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={saveWebhook} 
                        disabled={savingWebhook}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
                      >
                        {savingWebhook ? t('apiDashboard.saving', 'Enregistrement...') : t('apiDashboard.btnSave', 'Enregistrer')}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingWebhook(false);
                          setWebhookUrl(keyData?.webhook_url || '');
                          setWebhookSecret(keyData?.webhook_secret || '');
                        }} 
                        className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-xl transition-colors hover:bg-slate-50"
                      >
                        {t('apiDashboard.btnCancel', 'Annuler')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {webhookUrl ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">URL Webhook Actuelle</p>
                          <code className="text-sm font-bold text-slate-800 block truncate">{webhookUrl}</code>
                        </div>
                        <button onClick={() => setEditingWebhook(true)} className="text-purple-600 font-bold hover:text-purple-700 bg-purple-50 px-4 py-2 rounded-lg whitespace-nowrap">
                          Modifier
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-500 font-medium mb-4">{t('apiDashboard.noWebhookDesc', 'Vous ne recevez pas les notifications en temps réel. Configurez un webhook pour automatiser la réception des codes SMS.')}</p>
                        <button onClick={() => setEditingWebhook(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/20">
                          {t('apiDashboard.btnConfigureWebhook', 'Configurer un Webhook')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {stats.discountRate > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600 mt-1">
                <SvgTag />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">{t('apiDashboard.b2bDiscountTitle', 'Réduction API Appliquée')}</h3>
                <p className="text-emerald-800 text-sm font-medium mt-1 leading-relaxed">
                  {t('apiDashboard.b2bDiscountDesc1', "Votre compte développeur bénéficie d'une réduction spéciale. Tous les tarifs renvoyés par notre API via l'endpoint")} <code className="bg-white/60 px-1.5 py-0.5 rounded text-emerald-900 font-bold">/v1/services</code> {t('apiDashboard.b2bDiscountDesc2', "tiennent déjà compte de vos")} <strong>-{stats.discountRate}%</strong> {t('apiDashboard.b2bDiscountDesc3', "de réduction.")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR RESOURCES */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h3 className="text-lg font-black text-slate-900 mb-6">{t('apiDashboard.resourcesTitle', 'Ressources Utiles')}</h3>
            
            <div className="space-y-4">
              <Link to="/api-docs" className="group block p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                    <SvgBook />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{t('apiDashboard.guideTitle', "Guide d'intégration")}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{t('apiDashboard.guideDesc', 'Exemples en Node.js, Python, PHP')}</p>
                  </div>
                </div>
              </Link>
              
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm mb-3">{t('apiDashboard.mainEndpoint', 'Endpoint Principal')}</h4>
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                  <code className="text-xs font-bold text-slate-600 truncate">
                    api.onesms-sn.com/v1
                  </code>
                </div>
              </div>

              <a href="mailto:support@onesms-sn.com" className="group block p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 group-hover:bg-amber-100 rounded-xl flex items-center justify-center transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-400 group-hover:text-amber-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{t('apiDashboard.supportTitle', 'Support Développeur')}</h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{t('apiDashboard.supportDesc', 'Une question technique ?')}</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
