import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gift, Copy, Share2, Users, Zap, CheckCircle2, Link2, ArrowRight, Coins, Clock, Award, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

// Type pour les filleuls
interface Referral {
  id: string
  referee_id: string
  referee_email: string
  status: 'pending' | 'qualified' | 'rewarded'
  created_at: string
  bonus_amount: number
}

export default function ReferralPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [linkBase, setLinkBase] = useState<string>('https://onesms-sn.com/register')
  const [loadingSettings, setLoadingSettings] = useState<boolean>(false)

  const referralCode = user?.referral_code as string | undefined

  // Liste des filleuls
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(true)

  // Stats utilisateur
  const [referralStats, setReferralStats] = useState<{
    total: number
    pending: number
    qualified: number
    rewarded: number
  }>({ total: 0, pending: 0, qualified: 0, rewarded: 0 })
  const [bonusStats, setBonusStats] = useState<{
    paid: number
    pending: number
  }>({ paid: 0, pending: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Charge la base de lien personnalisée depuis system_settings (referral_link_base)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true)
        const { data, error } = await (supabase as any)
          .from('system_settings')
          .select('key,value')
          .eq('key', 'referral_link_base')
          .maybeSingle()

        if (!error && data?.value) {
          setLinkBase(String(data.value))
        }
      } catch (err) {
        console.warn('[REFERRAL] settings fetch failed', err)
      } finally {
        setLoadingSettings(false)
      }
    }

    loadSettings()
  }, [])

  // Fetch referral stats for current user
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return
      setLoadingStats(true)
      try {
        // Récupérer le bonus par parrainage depuis les settings
        const { data: bonusSetting } = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'referral_bonus_referrer')
          .maybeSingle()
        
        const bonusPerReferral = parseFloat(bonusSetting?.value || '5') // Default 5Ⓐ
        
        // Parrainages
        const { data: referrals } = await (supabase as any)
          .from('referrals')
          .select('status')
          .eq('referrer_id', user.id)

        const stats = { total: 0, pending: 0, qualified: 0, rewarded: 0 }
        ;(referrals as any[] || []).forEach((r: any) => {
          stats.total += 1
          if (r.status === 'pending') stats.pending += 1
          if (r.status === 'qualified') stats.qualified += 1
          if (r.status === 'rewarded') stats.rewarded += 1
        })
        setReferralStats(stats)

        // Bonus transactions (amount is in credits/tokens Ⓐ)
        const { data: bonuses } = await (supabase as any)
          .from('transactions')
          .select('amount, status')
          .eq('type', 'referral_bonus')
          .eq('user_id', user.id)

        const bonus = { paid: 0, pending: 0 }
        ;(bonuses as any[] || []).forEach((tx: any) => {
          const val = Math.abs(tx?.amount || 0) // amount is in credits
          if (tx.status === 'completed') bonus.paid += val
        })
        
        // "En attente" = filleuls pending × bonus par filleul
        // Ce sont les bonus potentiels que l'utilisateur recevra quand ses filleuls rechargeront
        bonus.pending = stats.pending * bonusPerReferral
        
        setBonusStats(bonus)
      } catch (err) {
        console.warn('[REFERRAL] stats fetch failed', err)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [user?.id])

  // Fetch liste des filleuls
  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user?.id) return
      setLoadingReferrals(true)
      try {
        // Récupérer le bonus par parrainage
        const { data: bonusSetting } = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'referral_bonus_referrer')
          .maybeSingle()
        
        const bonusPerReferral = parseFloat(bonusSetting?.value || '5')

        // Récupérer les parrainages avec les infos des filleuls
        const { data: referralData } = await (supabase as any)
          .from('referrals')
          .select('id, referee_id, status, created_at')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })

        if (!referralData || referralData.length === 0) {
          setReferrals([])
          return
        }

        // Récupérer les emails des filleuls
        const refereeIds = referralData.map((r: any) => r.referee_id)
        const { data: users } = await (supabase as any)
          .from('users')
          .select('id, email')
          .in('id', refereeIds)

        const userMap = new Map((users || []).map((u: any) => [u.id, u.email]))

        // Mapper les données
        const mappedReferrals: Referral[] = referralData.map((r: any) => ({
          id: r.id,
          referee_id: r.referee_id,
          referee_email: userMap.get(r.referee_id) || 'Utilisateur inconnu',
          status: r.status,
          created_at: r.created_at,
          bonus_amount: r.status === 'rewarded' ? bonusPerReferral : 0
        }))

        setReferrals(mappedReferrals)
      } catch (err) {
        console.warn('[REFERRAL] list fetch failed', err)
      } finally {
        setLoadingReferrals(false)
      }
    }
    fetchReferrals()
  }, [user?.id])

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const baseSetting = (linkBase || '').replace(/\/$/, '')
    const originBase = `${window.location.origin}/register`
    const base = baseSetting || originBase
    if (!referralCode) return base
    return `${base}?ref=${encodeURIComponent(referralCode)}`
  }, [referralCode, linkBase])

  const copyText = async (text: string, success: string) => {
    if (!text) {
      toast({ title: t('common.error'), description: 'Aucun texte à copier', variant: 'destructive' })
      return
    }

    console.log('[COPY] Attempting to copy:', text)

    // Méthode 1 : Clipboard API moderne
    const tryClipboardAPI = async (): Promise<boolean> => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          console.log('[COPY] Clipboard API success')
          return true
        }
      } catch (e) {
        console.warn('[COPY] Clipboard API failed:', e)
      }
      return false
    }

    // Méthode 2 : execCommand fallback avec input
    const tryExecCommand = (): boolean => {
      try {
        const input = document.createElement('input')
        input.value = text
        input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;'
        document.body.appendChild(input)
        input.focus()
        input.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(input)
        console.log('[COPY] execCommand result:', ok)
        return ok
      } catch (e) {
        console.warn('[COPY] execCommand failed:', e)
        return false
      }
    }

    // Essayer les deux méthodes
    let copied = await tryClipboardAPI()
    if (!copied) {
      copied = tryExecCommand()
    }

    if (copied) {
      toast({ title: success })
    } else {
      // En dernier recours, suggérer la copie manuelle
      toast({ 
        title: 'Copie manuelle requise', 
        description: text,
        duration: 10000
      })
    }
  }

  const handleCopyCode = async () => {
    if (!referralCode) return
    copyText(referralCode, t('referral.copiedCode'))
  }

  const handleCopyLink = async () => {
    if (!referralLink) return
    copyText(referralLink, t('referral.linkCopied'))
  }

  const handleShare = async () => {
    const payload = {
      title: t('referral.shareTitle'),
      text: t('referral.shareText'),
      url: referralLink,
    }
    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
    } catch (err) {
      console.warn('[REFERRAL] native share error', err)
    }
    handleCopyLink()
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-cyan-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-2 text-cyan-200 text-sm font-medium mb-4">
            <Gift className="w-4 h-4" />
            <span>{t('referral.badge')}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">
            {t('referral.pageTitle')}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mb-6">
            {t('referral.pageSubtitle')}
          </p>

          {/* Bonus Highlight */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-4 md:p-5 max-w-2xl mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-yellow-500/30">
                <span className="text-2xl">🎁</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg md:text-xl">
                  {t('referral.bonusHighlight')}
                </p>
                <p className="text-cyan-200 text-sm">
                  {t('referral.bonusHighlightDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Code Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 max-w-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-blue-200 mb-1">{t('referral.yourCode')}</p>
                <p className="text-3xl md:text-4xl font-mono font-black tracking-widest">
                    {referralCode || (loadingSettings ? '…' : '------')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleCopyCode}
                  disabled={!referralCode}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg shadow-blue-900/20"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('referral.copyCodeCta')}
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={!referralLink}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold shadow-lg shadow-cyan-900/30"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('referral.shareCta')}
                </Button>
              </div>
            </div>

            {/* Link preview */}
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
              <Link2 className="w-5 h-5 text-cyan-300 flex-shrink-0" />
              <p className="text-sm text-blue-100 truncate flex-1">{referralLink}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 text-cyan-100 hover:text-white hover:bg-white/10"
              >
                <Copy className="w-4 h-4 mr-1" /> Copier
              </Button>
            </div>

            <p className="text-sm text-blue-200/80 mt-4">{t('referral.hint')}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center">
              <Users className="w-6 h-6 text-cyan-300 mx-auto mb-2" />
              <p className="text-2xl font-bold">{loadingStats ? '…' : referralStats.total}</p>
              <p className="text-xs text-blue-200">Filleuls</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center">
              <Award className="w-6 h-6 text-emerald-300 mx-auto mb-2" />
              <p className="text-2xl font-bold">{loadingStats ? '…' : referralStats.rewarded}</p>
              <p className="text-xs text-blue-200">Récompensés</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center">
              <Coins className="w-6 h-6 text-yellow-300 mx-auto mb-2" />
              <p className="text-2xl font-bold">{loadingStats ? '…' : `${Math.floor(bonusStats.paid)} Ⓐ`}</p>
              <p className="text-xs text-blue-200">Gagnés</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-center">
              <Clock className="w-6 h-6 text-orange-300 mx-auto mb-2" />
              <p className="text-2xl font-bold">{loadingStats ? '…' : `${Math.floor(bonusStats.pending)} Ⓐ`}</p>
              <p className="text-xs text-blue-200">En attente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        
        {/* Liste des filleuls */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mes Filleuls</h2>
              <p className="text-sm text-gray-500">Liste des personnes que vous avez parrainées</p>
            </div>
          </div>

          {loadingReferrals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucun filleul pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">Partagez votre lien pour commencer à parrainer !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div 
                  key={referral.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {referral.referee_email.replace(/(.{3})(.*)(@.*)/, '$1***$3')}
                      </p>
                      <p className="text-xs text-gray-500">
                        Inscrit le {new Date(referral.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline"
                      className={
                        referral.status === 'rewarded' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : referral.status === 'qualified'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }
                    >
                      {referral.status === 'rewarded' ? '✓ Récompensé' : referral.status === 'qualified' ? '⏳ Qualifié' : '⏳ En attente'}
                    </Badge>
                    {referral.status === 'rewarded' && (
                      <span className="text-sm font-semibold text-emerald-600">+{referral.bonus_amount} Ⓐ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('referral.stepsTitle')}</h2>
            <p className="text-gray-600">{t('referral.stepsSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Share2, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30' },
              { icon: Users, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
              { icon: Zap, color: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30' },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className="group relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
                >
                  {idx < 2 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg ${item.shadow} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t(`referral.step${idx + 1}Title`)}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t(`referral.step${idx + 1}Desc`)}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('referral.benefitsTitle')}</h2>
              <p className="text-sm text-gray-500">{t('referral.benefitsSubtitle')}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[t('referral.benefitEarn'), t('referral.benefitReferee'), t('referral.benefitSafe')].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Share section */}
        <section className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">{t('referral.shareSectionTitle')}</h2>
              <p className="text-blue-100">{t('referral.shareSectionSubtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={handleCopyCode}
                disabled={!referralCode}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold"
              >
                <Copy className="w-4 h-4 mr-2" />
                {t('referral.copyCodeCta')}
              </Button>
              <Button
                onClick={handleShare}
                disabled={!referralLink}
                className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t('referral.shareCta')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
