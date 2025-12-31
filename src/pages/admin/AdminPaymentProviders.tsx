import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CreditCard,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Settings,
  Star,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react'

interface PaymentProvider {
  id: string
  provider_code: string
  provider_name: string
  is_active: boolean
  is_default: boolean
  priority: number
  config: Record<string, any>
  supported_methods: string[]
  fees_config: Record<string, any>
  logo_url?: string
  description?: string
  updated_at: string
}

interface ProviderLog {
  id: string
  action: string
  old_value: any
  new_value: any
  created_at: string
  admin_id: string
}

export default function AdminPaymentProviders() {
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<ProviderLog[]>([])
  const [configData, setConfigData] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Stock Shortage State
  const [stockShortageMode, setStockShortageMode] = useState(false)

  useEffect(() => {
    loadProviders()
    loadStockShortageMode()
  }, [])

  const loadStockShortageMode = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('value')
        .eq('key', 'stock_shortage_mode')
        .single()

      if (data) {
        setStockShortageMode(data.value === 'true')
      }
    } catch (error) {
      console.error('Error loading stock shortage mode:', error)
    }
  }

  const toggleStockShortage = async () => {
    setSaving('stock_shortage')
    try {
      const newValue = !stockShortageMode

      // Check if setting exists first
      const { data: existing } = await (supabase as any)
        .from('system_settings')
        .select('id')
        .eq('key', 'stock_shortage_mode')
        .single()

      let error;

      if (existing) {
        const { error: updateError } = await (supabase as any)
          .from('system_settings')
          .update({ value: String(newValue) })
          .eq('key', 'stock_shortage_mode')
        error = updateError
      } else {
        const { error: insertError } = await (supabase as any)
          .from('system_settings')
          .insert({
            key: 'stock_shortage_mode',
            value: String(newValue),
            description: 'Active le mode rupture de stock pour bloquer les recharges'
          })
        error = insertError
      }

      if (error) throw error

      setStockShortageMode(newValue)
      showMessage('success', `Mode Rupture de Stock ${newValue ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`)

      // Log action
      await (supabase as any).from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'toggle_stock_shortage',
        details: { value: newValue }
      })

    } catch (error) {
      console.error('Error toggling stock shortage:', error)
      showMessage('error', 'Impossible de modifier le mode rupture de stock')
    } finally {
      setSaving(null)
    }
  }

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_providers')
        .select('*')
        .order('priority', { ascending: true })

      if (error) throw error
      setProviders(data || [])
    } catch (error) {
      console.error('Error loading providers:', error)
      showMessage('error', 'Erreur lors du chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_provider_logs')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setLogs(data || [])
      setShowLogs(true)
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const toggleActive = async (provider: PaymentProvider) => {
    setSaving(provider.id)
    try {
      const newActiveState = !provider.is_active

      const { error } = await supabase
        .from('payment_providers')
        .update({ is_active: newActiveState })
        .eq('id', provider.id)

      if (error) throw error

      // Logger l'action
      await supabase.from('payment_provider_logs').insert({
        provider_id: provider.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: newActiveState ? 'activated' : 'deactivated',
        old_value: { is_active: provider.is_active },
        new_value: { is_active: newActiveState },
      })

      await loadProviders()
      showMessage('success', `${provider.provider_name} ${newActiveState ? 'activé' : 'désactivé'}`)
    } catch (error) {
      console.error('Error toggling provider:', error)
      showMessage('error', 'Erreur lors de la modification')
    } finally {
      setSaving(null)
    }
  }

  const setAsDefault = async (provider: PaymentProvider) => {
    setSaving(provider.id)
    try {
      // Retirer le défaut des autres
      await supabase
        .from('payment_providers')
        .update({ is_default: false })
        .neq('id', provider.id)

      // Définir comme défaut et activer
      const { error } = await supabase
        .from('payment_providers')
        .update({ is_default: true, is_active: true })
        .eq('id', provider.id)

      if (error) throw error

      // Logger l'action
      await supabase.from('payment_provider_logs').insert({
        provider_id: provider.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'set_default',
        old_value: { is_default: provider.is_default },
        new_value: { is_default: true },
      })

      await loadProviders()
      showMessage('success', `${provider.provider_name} défini comme fournisseur par défaut`)
    } catch (error) {
      console.error('Error setting default:', error)
      showMessage('error', 'Erreur lors de la modification')
    } finally {
      setSaving(null)
    }
  }

  const openConfigModal = (provider: PaymentProvider) => {
    setSelectedProvider(provider)
    setConfigData(provider.config || {})
    setShowConfig(true)
  }

  const saveConfig = async () => {
    if (!selectedProvider) return

    setSaving(selectedProvider.id)
    try {
      const { error } = await supabase
        .from('payment_providers')
        .update({ config: configData })
        .eq('id', selectedProvider.id)

      if (error) throw error

      // Logger l'action
      await supabase.from('payment_provider_logs').insert({
        provider_id: selectedProvider.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'updated_config',
        old_value: selectedProvider.config,
        new_value: configData,
      })

      await loadProviders()
      setShowConfig(false)
      showMessage('success', 'Configuration sauvegardée')
    } catch (error) {
      console.error('Error saving config:', error)
      showMessage('error', 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(null)
    }
  }

  const getConfigFields = (providerCode: string) => {
    const configs: Record<string, Array<{ key: string, label: string, type: string, placeholder: string }>> = {
      paydunya: [
        { key: 'master_key', label: 'Master Key', type: 'password', placeholder: 'wQzk9ZwR-Qq9m-...' },
        { key: 'private_key', label: 'Private Key', type: 'password', placeholder: 'test_private_...' },
        { key: 'token', label: 'Token', type: 'password', placeholder: 'IivOiOxGJuWhc5znlIiK' },
        { key: 'mode', label: 'Mode', type: 'select', placeholder: 'test|live' },
        { key: 'callback_url', label: 'Callback URL', type: 'text', placeholder: 'https://...' },
      ],
      moneyfusion: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'mf_...' },
        { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '...' },
        { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'MF123456' },
        { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://...' },
      ],
      paytech: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'pt_...' },
        { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '...' },
        { key: 'env', label: 'Environment', type: 'select', placeholder: 'test|prod' },
      ],
      moneroo: [
        { key: 'test_mode', label: 'Mode', type: 'select', placeholder: 'true|false' },
        { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://api.moneroo.io/v1' },
      ],
    }
    return configs[providerCode] || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Fournisseurs de Paiement
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez les passerelles de paiement disponibles pour vos utilisateurs
          </p>
        </div>

        {/* Stock Shortage Toggle */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${stockShortageMode
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-gray-200'
          }`}>
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${stockShortageMode ? 'text-red-800' : 'text-gray-700'
              }`}>
              Mode Rupture de Stock
            </span>
            <span className="text-xs text-gray-500">
              {stockShortageMode ? 'Recharges bloquées' : 'Recharges actives'}
            </span>
          </div>
          <button
            onClick={toggleStockShortage}
            disabled={saving === 'stock_shortage'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${stockShortageMode ? 'bg-red-600' : 'bg-gray-200'
              }`}
          >
            <span
              className={`${stockShortageMode ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>
      </div>

      {/* Message de notification */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Liste des fournisseurs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${provider.is_active
              ? 'border-green-500 shadow-green-100'
              : 'border-gray-200 opacity-75'
              }`}
          >
            {/* Header de la carte */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {provider.logo_url ? (
                  <img
                    src={provider.logo_url}
                    alt={provider.provider_name}
                    className="w-12 h-12 rounded-lg object-contain bg-gray-50 p-2"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    {provider.provider_name}
                    {provider.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-500">{provider.provider_code}</p>
                </div>
              </div>

              {/* Toggle actif/inactif */}
              <button
                onClick={() => toggleActive(provider)}
                disabled={saving === provider.id}
                className={`p-2 rounded-lg transition-colors ${provider.is_active
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                  }`}
              >
                {saving === provider.id ? (
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : provider.is_active ? (
                  <ToggleRight className="w-6 h-6" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {provider.description || 'Aucune description disponible'}
            </p>

            {/* Méthodes supportées */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Moyens de paiement supportés:
              </p>
              <div className="flex flex-wrap gap-1">
                {provider.supported_methods.slice(0, 4).map((method) => (
                  <span
                    key={method}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {method.replace(/-/g, ' ').substring(0, 10)}
                  </span>
                ))}
                {provider.supported_methods.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{provider.supported_methods.length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* Statut */}
            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${provider.is_active ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              <span className="text-xs font-medium text-gray-700">
                {provider.is_active ? 'Actif' : 'Inactif'}
              </span>
              {provider.is_default && (
                <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  Par défaut
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => openConfigModal(provider)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                Configurer
              </button>

              {!provider.is_default && provider.is_active && (
                <button
                  onClick={() => setAsDefault(provider)}
                  disabled={saving === provider.id}
                  className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                  title="Définir comme défaut"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => loadLogs(provider.id)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                title="Voir l'historique"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de configuration */}
      {showConfig && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                Configuration {selectedProvider.provider_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configurez les clés API et paramètres du fournisseur
              </p>
            </div>

            <div className="p-6 space-y-4">
              {getConfigFields(selectedProvider.provider_code).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={String(configData[field.key] || '')}
                      onChange={(e) => {
                        const value = e.target.value
                        // Convert to boolean for test_mode field
                        const parsedValue = field.key === 'test_mode'
                          ? value === 'true'
                          : value
                        setConfigData({ ...configData, [field.key]: parsedValue })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner...</option>
                      {field.placeholder.split('|').map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type={field.type}
                        value={configData[field.key] || ''}
                        onChange={(e) => setConfigData({ ...configData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector(`input[placeholder="${field.placeholder}"]`) as HTMLInputElement
                            if (input) {
                              input.type = input.type === 'password' ? 'text' : 'password'
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {configData[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ Attention</p>
                    <p>Les clés API sont sensibles. Ne les partagez jamais et stockez-les de manière sécurisée.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveConfig}
                disabled={saving === selectedProvider.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving === selectedProvider.id ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal des logs */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <History className="w-6 h-6" />
                Historique des modifications
              </h2>
            </div>

            <div className="p-6">
              {logs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune modification enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                          {JSON.stringify({ old: log.old_value, new: log.new_value }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowLogs(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
