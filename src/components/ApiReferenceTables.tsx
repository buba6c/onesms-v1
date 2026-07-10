import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Server, Globe2, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getServiceLogo, getCountryFlag } from '@/lib/logo-service'

export function ApiReferenceTables() {
  const { t } = useTranslation()
  const [services, setServices] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [searchService, setSearchService] = useState('')
  const [searchCountry, setSearchCountry] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [servicesRes, countriesRes] = await Promise.all([
          supabase.from('services').select('id, name, code, icon').eq('active', true).order('name'),
          supabase.from('countries').select('id, code, name, flag_emoji').eq('active', true).order('name')
        ])

        if (servicesRes.data) setServices(servicesRes.data)
        if (countriesRes.data) setCountries(countriesRes.data)
      } catch (err) {
        console.error("Error fetching reference data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredServices = services.filter(s => 
    s.name?.toLowerCase().includes(searchService.toLowerCase()) || 
    s.code?.toLowerCase().includes(searchService.toLowerCase())
  )

  const filteredCountries = countries.filter(c => 
    c.name?.toLowerCase().includes(searchCountry.toLowerCase()) || 
    c.display_name?.toLowerCase().includes(searchCountry.toLowerCase()) || 
    c.iso_code?.toLowerCase().includes(searchCountry.toLowerCase())
  )

  return (
    <div className="space-y-8 mt-16" id="products-list">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
          Tables de Référence
        </h2>
        <p className="text-gray-600">
          Listes complètes des codes de services et de pays acceptés par l'API. Utilisez ces codes dans vos requêtes <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm">/v1/buy</code> et <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm">/v1/services</code>.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Services Table */}
        <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Server className="w-4 h-4 text-slate-600" />
                Services (Produits)
              </CardTitle>
              <span className="text-xs font-semibold bg-slate-200/70 text-slate-800 px-2.5 py-0.5 rounded-full">
                {services.length} actifs
              </span>
            </div>
            <CardDescription className="text-slate-600 text-xs">
              Utilisez le champ <code className="font-semibold text-slate-900 font-mono">code</code> dans le body de vos requêtes.
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Rechercher un service (ex: whatsapp, wa...)" 
                className="pl-9 bg-white border-gray-200"
                value={searchService}
                onChange={e => setSearchService(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Service</th>
                      <th className="px-6 py-3 font-semibold text-right">Code API</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredServices.length > 0 ? filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-2">
                          <img src={getServiceLogo(service.code)} alt={service.name} className="w-6 h-6 object-contain rounded" onError={(e) => { e.currentTarget.style.display = "none"; if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline"; }} /><span className="text-lg hidden">📱</span>
                          {service.name}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <code className="bg-slate-100 text-blue-700 px-2 py-1 rounded font-mono text-xs font-bold border border-slate-200">
                            {service.code}
                          </code>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                          Aucun service trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Countries Table */}
        <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Globe2 className="w-4 h-4 text-slate-600" />
                Pays supportés
              </CardTitle>
              <span className="text-xs font-semibold bg-slate-200/70 text-slate-800 px-2.5 py-0.5 rounded-full">
                {countries.length} pays
              </span>
            </div>
            <CardDescription className="text-slate-600 text-xs">
              Vous pouvez utiliser le nom en minuscules ou le code ISO.
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Rechercher un pays (ex: senegal, sn...)" 
                className="pl-9 bg-white border-gray-200"
                value={searchCountry}
                onChange={e => setSearchCountry(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Pays</th>
                      <th className="px-6 py-3 font-semibold text-right">Code ISO / Nom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCountries.length > 0 ? filteredCountries.map((country) => (
                      <tr key={country.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-3">
                          <img src={getCountryFlag(country.code)} alt={country.name} className="w-6 h-6 object-cover rounded shadow-sm border border-gray-100" onError={(e) => { e.currentTarget.style.display = "none"; if (e.currentTarget.nextElementSibling) (e.currentTarget.nextElementSibling as HTMLElement).style.display = "inline"; }} /><span className="text-xl hidden">{country.flag_emoji || "🌐"}</span>
                          {country.name}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <code className="bg-slate-100 text-indigo-700 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-slate-200">
                              {country.code?.toLowerCase() || 'N/A'}
                            </code>
                            <code className="text-[10px] text-gray-400 font-mono">
                              {country.name?.toLowerCase()}
                            </code>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                          Aucun pays trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex items-start gap-3 mt-6">
        <ArrowRight className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Astuce :</strong> Le système est très flexible. Pour le pays, vous pouvez envoyer <code className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-900">"senegal"</code>, <code className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-900">"sn"</code>, ou même l'UUID interne. Pour les services, vous pouvez envoyer <code className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-900">"wa"</code> ou <code className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-900">"whatsapp"</code>. Nous recommandons d'utiliser le <strong className="text-slate-900">Code API</strong> pour les services et le <strong className="text-slate-900">Code ISO</strong> pour les pays afin d'assurer une compatibilité maximale.
        </p>
      </div>
    </div>
  )
}
