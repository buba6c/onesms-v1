import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Save, ShieldCheck, Link2, Type, Hash, BarChart, Coins, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SystemSetting {
  key: string
  value: string
  category: string
  description?: string
}

interface ReferralField {
  key: string
  label: string
  description?: string
  type: 'boolean' | 'number' | 'text' | 'textarea'
  placeholder?: string
}

const REFERRAL_FIELDS: ReferralField[] = [
  {
    key: 'referral_enabled',
    label: 'Activer le programme',
    description: 'Active/désactive l\'affichage des codes et le crédit automatique',
    type: 'boolean',
  },
  {
    key: 'referral_bonus_referrer',
    label: 'Bonus parrain (tokens)',
    description: 'Nombre de tokens crédités au parrain lors de la qualification',
    type: 'number',
    placeholder: '5',
  },
  {
    key: 'referral_bonus_referee',
    label: 'Bonus filleul (tokens)',
    description: 'Nombre de tokens crédités au filleul à la première recharge éligible',
    type: 'number',
    placeholder: '5',
  },
  {
    key: 'referral_trigger',
    label: 'Déclencheur',
    description: 'first_recharge uniquement pour le moment',
    type: 'text',
    placeholder: 'first_recharge',
  },
  {
    key: 'referral_min_recharge_amount',
    label: 'Montant minimum de recharge',
    description: 'Seuil minimum pour qualifier la première recharge',
    type: 'number',
    placeholder: '0',
  },
  {
    key: 'referral_expiry_days',
    label: 'Délai de qualification (jours)',
    description: 'Délai maximum entre inscription et qualification du filleul',
    type: 'number',
    placeholder: '14',
  },
  {
    key: 'referral_monthly_cap',
    label: 'Plafond mensuel par parrain',
    description: 'Limite de filleuls récompensés par mois et par parrain',
    type: 'number',
    placeholder: '20',
  },
  {
    key: 'referral_self_referral_block',
    label: 'Bloquer auto-référence',
    description: 'Empêche l\'utilisation de son propre code',
    type: 'boolean',
  },
  {
    key: 'referral_anti_fraud_level',
    label: 'Niveau anti-fraude',
    description: 'low / medium / high',
    type: 'text',
    placeholder: 'medium',
  },
  {
    key: 'referral_notify_email',
    label: 'Notifier par email',
    description: 'Envoie un email lors de la qualification',
    type: 'boolean',
  },
  {
    key: 'referral_notify_inapp',
    label: 'Notifier in-app',
    description: 'Affiche une notification dans le tableau de bord',
    type: 'boolean',
  },
  {
    key: 'referral_reminder_days',
    label: 'Rappels (jours)',
    description: 'Liste séparée par des virgules pour relancer le filleul',
    type: 'text',
    placeholder: '1,3,7',
  },
  {
    key: 'referral_terms_link',
    label: 'Lien des conditions',
    description: 'URL des conditions du programme',
    type: 'text',
    placeholder: 'https://...',
  },
  {
    key: 'referral_code_length',
    label: 'Longueur du code',
    description: 'Longueur du code de parrainage généré',
    type: 'number',
    placeholder: '8',
  },
  {
    key: 'referral_code_prefix',
    label: 'Préfixe du code',
    description: 'Préfixe appliqué aux codes générés (optionnel)',
    type: 'text',
    placeholder: 'one-',
  },
  {
    key: 'referral_link_base',
    label: 'Base du lien de parrainage',
    description: 'URL de base pour générer le lien (par défaut window.location.origin/register)',
    type: 'text',
    placeholder: 'https://app.mondomaine.com/register',
  },
  {
    key: 'referral_allow_custom_code',
    label: 'Autoriser code personnalisé',
    description: 'Autorise la saisie manuelle d’un code par l’admin',
    type: 'boolean',
  },
  {
    key: 'referral_allowed_domains',
    label: 'Domaines autorisés',
    description: 'Liste blanche emails (séparés par virgule)',
    type: 'textarea',
    placeholder: 'example.com,entreprise.sn',
  },
  {
    key: 'referral_blocked_domains',
    label: 'Domaines bloqués',
    description: 'Liste noire emails (séparés par virgule)',
    type: 'textarea',
    placeholder: 'temp-mail.org,10minutemail.com',
  },
]

export default function AdminReferrals() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [expandedReferrer, setExpandedReferrer] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery<SystemSetting[]>({
    queryKey: ['referral-settings'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('system_settings')
        .select('*')
        .ilike('key', 'referral_%')
        .order('key', { ascending: true })

      if (error) throw error
      return rows || []
    },
  })

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const { data: rpcData, error } = await supabase.rpc('admin_referral_stats')
      if (error) throw error
      const row = rpcData?.[0] || {}
      return {
        total: Number(row.total || 0),
        pending: Number(row.pending || 0),
        qualified: Number(row.qualified || 0),
        rewarded: Number(row.rewarded || 0),
        rejected: Number(row.rejected || 0),
        expired: Number(row.expired || 0),
        bonusPaidAmount: Number(row.bonus_amount || 0) / 100, // fcfa -> credits (assumes 1Ⓐ=100 FCFA)
        bonusPaidCount: Number(row.bonus_count || 0),
        bonusPendingAmount: Number(row.bonus_pending_amount || 0) / 100,
        bonusPendingCount: Number(row.bonus_pending_count || 0),
      }
    },
  })

  // Fetch referrers with their referees and bonus amounts
  const { data: referrersData, isLoading: loadingReferrers, refetch: refetchReferrers } = useQuery({
    queryKey: ['referrers-list'],
    queryFn: async () => {
      const { data: rpcData, error } = await supabase.rpc('admin_referrals_list')
      if (error) throw error
      if (!rpcData?.length) return []

      const referrerMap = new Map<string, {
        email: string
        referees: Array<{ email: string; status: string; createdAt: string }>
      }>()

      const FCFA_TO_CREDITS = 100
      const bonusByReferrer = new Map<string, number>()

      rpcData.forEach(r => {
        const referrerId = r.referrer_id || 'unknown'
        const referrerEmail = r.referrer_email || 'Inconnu'
        const refereeEmail = r.referee_email || 'Inconnu'
        const bonus = Number(r.referrer_total_bonus || 0) / FCFA_TO_CREDITS

        if (!referrerMap.has(referrerId)) {
          referrerMap.set(referrerId, {
            email: referrerEmail,
            referees: []
          })
          bonusByReferrer.set(referrerId, bonus)
        }

        referrerMap.get(referrerId)!.referees.push({
          email: refereeEmail,
          status: r.status,
          createdAt: r.created_at
        })
      })

      return Array.from(referrerMap.entries())
        .map(([id, data]) => ({ id, ...data, totalBonus: bonusByReferrer.get(id) || 0 }))
        .sort((a, b) => b.totalBonus - a.totalBonus)
    },
  })

  const formatStatus = (status: string) => {
    if (!status) return '—'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  useEffect(() => {
    if (!data) return
    const nextValues: Record<string, string> = {}
    data.forEach((row) => {
      nextValues[row.key] = row.value ?? ''
    })
    setValues(nextValues)
    setHasChanges(false)
  }, [data])

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const rows = Object.entries(payload).map(([key, value]) => ({
        key,
        value,
        category: 'referral',
      }))

      const { error } = await supabase.from('system_settings').upsert(rows as any, {
        onConflict: 'key',
      })
      if (error) throw error
      return true
    },
    onSuccess: () => {
      setHasChanges(false)
      queryClient.invalidateQueries({ queryKey: ['referral-settings'] })
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      toast({
        title: 'Paramètres enregistrés',
        description: 'Le programme de parrainage est à jour.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder les paramètres.',
        variant: 'destructive',
      })
    },
  })

  const setCodeMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const normalized = code.trim().toLowerCase()
      if (!normalized) throw new Error('Code requis')

      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle()

      if (userErr) throw userErr
      if (!userRow?.id) throw new Error('Utilisateur introuvable')

      const { error: updateErr } = await supabase
        .from('users')
        .update({ referral_code: normalized })
        .eq('id', userRow.id)

      if (updateErr) throw updateErr
      return { userId: userRow.id, code: normalized }
    },
    onSuccess: (res) => {
      setCustomCode('')
      toast({ title: 'Code mis à jour', description: `Code ${res.code} enregistré.` })
    },
    onError: (error: any) => {
      const message = error?.message?.includes('duplicate key')
        ? 'Ce code existe déjà.'
        : error?.message || 'Mise à jour impossible'
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
    },
  })

  const handleChange = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value.toString() }))
    setHasChanges(true)
  }

  const grouped = useMemo(() => {
    const booleans = REFERRAL_FIELDS.filter((f) => f.type === 'boolean')
    const numbers = REFERRAL_FIELDS.filter((f) => f.type === 'number')
    const texts = REFERRAL_FIELDS.filter((f) => f.type === 'text')
    const textareas = REFERRAL_FIELDS.filter((f) => f.type === 'textarea')
    return { booleans, numbers, texts, textareas }
  }, [])

  const handleSave = () => {
    mutation.mutate(values)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parrainage</h1>
          <p className="text-gray-500 mt-1">
            Gérer l\'activation, les bonus et les garde-fous du programme.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Statistiques rapides</CardTitle>
              <CardDescription>Suivi du programme (par statut)</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {['total', 'pending', 'qualified', 'rewarded', 'rejected', 'expired'].map((key) => (
            <div key={key} className="rounded-xl border bg-white p-3">
              <p className="text-xs text-gray-500 uppercase">{key}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loadingStats ? '…' : stats?.[key] ?? 0}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle>Bonus parrainage</CardTitle>
              <CardDescription>Montants versés et en attente</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">Versés</p>
            <p className="text-2xl font-bold text-gray-900">
              {loadingStats ? '…' : `${Math.floor(stats?.bonusPaidAmount || 0)} Ⓐ`}
            </p>
            <p className="text-sm text-gray-500">{loadingStats ? '…' : `${stats?.bonusPaidCount || 0} transaction(s)`}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">En attente</p>
            <p className="text-2xl font-bold text-gray-900">
              {loadingStats ? '…' : `${Math.floor(stats?.bonusPendingAmount || 0)} Ⓐ`}
            </p>
            <p className="text-sm text-gray-500">{loadingStats ? '…' : `${stats?.bonusPendingCount || 0} transaction(s)`}</p>
          </div>
        </CardContent>
      </Card>

      {/* Liste des parrains avec filleuls */}
      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle>Liste des parrains</CardTitle>
              <CardDescription>Parrains avec leurs filleuls et bonus reçus</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchReferrers()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {loadingReferrers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !referrersData?.length ? (
            <p className="text-center text-gray-500 py-8">Aucun parrainage trouvé</p>
          ) : (
            <div className="overflow-hidden border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10"></th>
                    <th className="text-left px-3 py-2 text-gray-700">Parrain</th>
                    <th className="text-center px-3 py-2 text-gray-700">Filleuls</th>
                    <th className="text-center px-3 py-2 text-gray-700">Récompensés</th>
                    <th className="text-right px-3 py-2 text-gray-700">Bonus reçu</th>
                  </tr>
                </thead>
                <tbody>
                  {referrersData.map((referrer) => {
                    const rewardedCount = referrer.referees.filter((r: any) => r.status === 'rewarded').length
                    return (
                      <Fragment key={referrer.id}>
                        <tr
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedReferrer(expandedReferrer === referrer.id ? null : referrer.id)}
                        >
                          <td className="px-3 py-2">
                            {expandedReferrer === referrer.id ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{referrer.email}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="secondary">{referrer.referees.length}</Badge>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">
                              {rewardedCount}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">
                            {Math.floor(referrer.totalBonus)} Ⓐ
                          </td>
                        </tr>
                        {expandedReferrer === referrer.id && (
                          <tr>
                            <td colSpan={5} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Filleuls :</p>
                                <div className="space-y-2">
                                  {referrer.referees.map((referee, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-white rounded-lg p-3 border">
                                      <span className="text-gray-700">{referee.email}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400">
                                          {new Date(referee.createdAt).toLocaleDateString('fr-FR')}
                                        </span>
                                        <Badge
                                          variant={referee.status === 'rewarded' ? 'default' : referee.status === 'qualified' ? 'secondary' : 'outline'}
                                          className={referee.status === 'rewarded' ? 'bg-emerald-600' : ''}
                                        >
                                          {formatStatus(referee.status)}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Protections & notifications
            </CardTitle>
            <CardDescription>Activation, anti-fraude et alertes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.booleans.map((field) => (
              <div key={field.key} className="flex items-start justify-between border rounded-lg p-4">
                <div className="pr-4">
                  <Label className="font-medium text-gray-900">{field.label}</Label>
                  {field.description && (
                    <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
                <Switch
                  checked={(values[field.key] ?? 'false') === 'true'}
                  onCheckedChange={(checked) => handleChange(field.key, checked)}
                />
              </div>
            ))}
            <div className="space-y-3">
              {grouped.texts
                .filter((f) => f.key === 'referral_anti_fraud_level' || f.key === 'referral_reminder_days')
                .map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-sm font-medium text-gray-800">{field.label}</Label>
                    {field.description && (
                      <p className="text-xs text-gray-500">{field.description}</p>
                    )}
                    <Input
                      value={values[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bonus et conditions</CardTitle>
            <CardDescription>Montants, plafonds et délais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped.numbers.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="text-sm font-medium text-gray-800">{field.label}</Label>
                {field.description && (
                  <p className="text-xs text-gray-500">{field.description}</p>
                )}
                <Input
                  type="number"
                  value={values[field.key] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              </div>
            ))}
            {grouped.texts
              .filter((f) => f.key === 'referral_trigger' || f.key === 'referral_terms_link')
              .map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-sm font-medium text-gray-800">{field.label}</Label>
                  {field.description && (
                    <p className="text-xs text-gray-500">{field.description}</p>
                  )}
                  <Input
                    value={values[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Personnalisation du lien et du code
          </CardTitle>
          <CardDescription>Définir la base d’URL et un préfixe de code par défaut</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['referral_link_base', 'referral_code_prefix'].map((key) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium text-gray-800">{REFERRAL_FIELDS.find((f) => f.key === key)?.label}</Label>
              <p className="text-xs text-gray-500">{REFERRAL_FIELDS.find((f) => f.key === key)?.description}</p>
              <Input
                value={values[key] ?? ''}
                placeholder={REFERRAL_FIELDS.find((f) => f.key === key)?.placeholder}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-800">Longueur du code</Label>
            <p className="text-xs text-gray-500">Nombre de caractères (minifier vos codes)</p>
            <Input
              type="number"
              value={values['referral_code_length'] ?? ''}
              placeholder="8"
              onChange={(e) => handleChange('referral_code_length', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-emerald-600" />
            Code utilisateur manuel
          </CardTitle>
          <CardDescription>Assigner ou corriger un code spécifique pour un utilisateur (email exact)</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-800">Email utilisateur</Label>
            <Input
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="user@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-800">Code souhaité</Label>
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="ex: one-1234"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setCodeMutation.mutate({ email: customEmail, code: customCode })}
              disabled={
                setCodeMutation.isPending ||
                !customEmail ||
                !customCode ||
                (values['referral_allow_custom_code'] ?? 'false') === 'false'
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {setCodeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hash className="w-4 h-4 mr-2" />}
              Enregistrer le code
            </Button>
            <Button variant="outline" onClick={() => { setCustomEmail(''); setCustomCode('') }}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domaines autorisés / bloqués</CardTitle>
          <CardDescription>
            Filtrer les emails pour limiter les abus (séparer par des virgules)
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped.textareas.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium text-gray-800">{field.label}</Label>
              {field.description && (
                <p className="text-xs text-gray-500">{field.description}</p>
              )}
              <Textarea
                value={values[field.key] ?? ''}
                placeholder={field.placeholder}
                rows={5}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
