import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, Check, Terminal, Shield, BookOpen, Sparkles, Code2, Layers, Cpu, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ApiReferenceTables } from '@/components/ApiReferenceTables'

export default function ApiDocumentation() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyText = (text: string, key: string, title = 'Copié !') => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title, description: 'Le contenu a été copié dans votre presse-papier.' })
    setTimeout(() => setCopiedKey(null), 2500)
  }

  // AI Assistant Direct Master Prompt (for ChatGPT, Claude, Cursor, Lovable)
  const aiMasterPrompt = `Tu es un expert en développement d'applications et en intégration d'API REST.
Tu dois intégrer l'API officielle de ONE SMS v1 dans mon projet.

### SPÉCIFICATIONS TECHNIQUES DE L'API ONE SMS :
- Base URL : https://api.onesms-sn.com/functions/v1/api/v1
- Authentification : Header HTTP obligatoire \`X-API-Key: <VOTRE_CLE_API>\` (ou \`Authorization: Bearer <VOTRE_CLE_API>\`). Remarque : privilégier X-API-Key si le framework intercepte l'en-tête Authorization.
- Unité de solde : Pièces Ⓐ (1 Ⓐ = 1 FCFA).

### 1. LES ENDPOINTS DISPONIBLES
1. **Consulter le solde** :
   - \`GET /balance\`
   - Réponse : \`{ "balance": 1500, "frozen": 300, "available": 1200, "currency": "Ⓐ" }\`
2. **Lister les services et tarifs** :
   - \`GET /services?country=senegal\`
   - Réponse : \`{ "services": [ { "service_code": "wa", "service_name": "WhatsApp", "country": "senegal", "price": 300 } ] }\`
3. **Acheter / Réserver un numéro** :
   - \`POST /buy\`
   - Body JSON : \`{ "service": "wa", "country": "senegal" }\`
   - Réponse : \`{ "success": true, "id": "uuid-activation", "phone": "221771234567", "price": 300, "status": "pending" }\`
4. **Vérifier l'arrivée du SMS (Polling)** :
   - \`GET /status/:id\`
   - Réponse : \`{ "id": "uuid-activation", "status": "completed" | "pending" | "cancelled", "sms_code": "123456", "sms_text": "Votre code WhatsApp est 123456." }\`
5. **Annuler une activation en attente et se faire rembourser** :
   - \`POST /cancel/:id\`
   - Réponse : \`{ "success": true, "status": "cancelled", "refunded": 300 }\`

### 2. FLUX RECOMMANDÉ POUR LE CODE À GÉNÉRER
1. Effectuer une requête POST sur \`/buy\` avec le code service (ex: \`wa\`) et le pays (ex: \`senegal\`).
2. Récupérer l'\`id\` d'activation et afficher le numéro \`phone\` à l'utilisateur.
3. Lancer une boucle de vérification automatique (Polling) toutes les 5 secondes sur \`/status/:id\` jusqu'à ce que \`status === "completed"\` (récupérer \`sms_code\`) ou \`status === "cancelled"\`.

Écris maintenant le code complet, propre, typé et prêt pour la production pour intégrer ONE SMS dans mon projet.`

  // TypeScript / Node Snippet
  const tsCodeSnippet = `// ONE SMS API Client - TypeScript / Node.js
const ONESMS_API_KEY = process.env.ONESMS_API_KEY || "VOTRE_CLE_API";
const BASE_URL = "https://api.onesms-sn.com/functions/v1/api/v1";

const headers = {
  "X-API-Key": ONESMS_API_KEY,
  "Content-Type": "application/json"
};

export async function buyAndWaitForSms(service = "wa", country = "senegal") {
  // 1. Acheter le numéro
  const buyRes = await fetch(\`\${BASE_URL}/buy\`, {
    method: "POST",
    headers,
    body: JSON.stringify({ service, country })
  });
  const activation = await buyRes.json();
  
  if (!activation.success) {
    throw new Error(activation.error || "Achat échoué");
  }

  console.log(\`Numéro attribué : \${activation.phone} (ID: \${activation.id})\`);

  // 2. Polling toutes les 5 secondes en attendant le SMS
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusRes = await fetch(\`\${BASE_URL}/status/\${activation.id}\`, { headers });
    const data = await statusRes.json();

    if (data.status === "completed") {
      console.log(\`SMS reçu ! Code : \${data.sms_code}\`);
      return data;
    }

    if (data.status === "cancelled") {
      throw new Error("Activation annulée.");
    }
  }
}`

  // Python Snippet
  const pythonCodeSnippet = `# ONE SMS API Client - Python 3
import os
import time
import requests

BASE_URL = "https://api.onesms-sn.com/functions/v1/api/v1"
HEADERS = {
    "X-API-Key": os.getenv("ONESMS_API_KEY", "VOTRE_CLE_API"),
    "Content-Type": "application/json"
}

def get_balance():
    response = requests.get(f"{BASE_URL}/balance", headers=HEADERS)
    return response.json()

def buy_number_and_wait(service="wa", country="senegal"):
    # 1. Acheter un numéro
    response = requests.post(
        f"{BASE_URL}/buy",
        headers=HEADERS,
        json={"service": service, "country": country}
    )
    activation = response.json()
    
    if not activation.get("success"):
        raise Exception(f"Erreur achat : {activation.get('error')}")
        
    activation_id = activation["id"]
    phone = activation["phone"]
    print(f"Numéro attribué : {phone} (ID: {activation_id})")

    # 2. Polling pour attendre le SMS
    for _ in range(120): # Timeout 10 minutes
        time.sleep(5)
        status_res = requests.get(f"{BASE_URL}/status/{activation_id}", headers=HEADERS)
        data = status_res.json()
        
        if data.get("status") == "completed":
            print(f"SMS reçu ! Code : {data['sms_code']}")
            return data
            
        if data.get("status") == "cancelled":
            raise Exception("L'activation a été annulée.")
            
    raise TimeoutError("Le délai d'attente du SMS a expiré.")`

  // cURL Snippet
  const curlCodeSnippet = `# 1. Vérifier le solde
curl -X GET "https://api.onesms-sn.com/functions/v1/api/v1/balance" \\
  -H "X-API-Key: VOTRE_CLE_API"

# 2. Acheter un numéro WhatsApp au Sénégal
curl -X POST "https://api.onesms-sn.com/functions/v1/api/v1/buy" \\
  -H "X-API-Key: VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{"service": "wa", "country": "senegal"}'

# 3. Vérifier la réception du SMS (remplacer ID_ACTIVATION)
curl -X GET "https://api.onesms-sn.com/functions/v1/api/v1/status/ID_ACTIVATION" \\
  -H "X-API-Key: VOTRE_CLE_API"`

  // PHP Snippet
  const phpCodeSnippet = `<?php
// ONE SMS API Client - PHP 8
function oneSmsRequest($endpoint, $method = 'GET', $body = null) {
    $apiKey = 'VOTRE_CLE_API';
    $baseUrl = 'https://api.onesms-sn.com/functions/v1/api/v1';
    
    $ch = curl_init($baseUrl . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $headers = [
        'X-API-Key: ' . $apiKey,
        'Content-Type: application/json'
    ];
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $result = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($result, true);
}

// Exemple : Récupérer le solde
$balance = oneSmsRequest('/balance');
print_r($balance);
?>`

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans pb-24 text-slate-900">
      {/* Editorial Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            to="/api-dashboard" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('apiDocs.backToDashboard', 'Retour au Dashboard')}</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wide text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <span>REST API v1.0</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200/80 pt-16 pb-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-500">
              <span>ONE SMS</span>
              <span>•</span>
              <span>Espace Développeur</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Documentation API
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed font-normal">
              Intégrez la location et l'achat de numéros de téléphone virtuels en quelques minutes. API REST rapide, sécurisée et compatible avec l'ensemble de vos outils et serveurs.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 space-y-16">
        
        {/* 1. SECTION AUTHENTIFICATION */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              1. Authentification & Headers HTTP
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Toutes les requêtes vers l'API nécessitent l'envoi de votre clé secrète dans les en-têtes HTTP.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Header X-API-Key (Recommended) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Header Recommandé
                </span>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  Lovable & Clients HTTP
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Header X-API-Key
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  À privilégier sur Lovable, Supabase Client ou Postman pour éviter toute interception automatique de l'en-tête Authorization.
                </p>
              </div>
              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 flex items-center justify-between font-mono text-sm">
                <span>X-API-Key: VOTRE_CLE_API</span>
                <button
                  onClick={() => copyText('X-API-Key: VOTRE_CLE_API', 'header-x-api-key')}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Copier"
                >
                  {copiedKey === 'header-x-api-key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Header Authorization Bearer */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
                  Header Standard
                </span>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  Backend REST
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Header Authorization Bearer
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Standard REST universel pour vos serveurs backend Node.js, Python, PHP ou Go.
                </p>
              </div>
              <div className="bg-slate-950 text-slate-100 rounded-xl p-4 flex items-center justify-between font-mono text-sm">
                <span>Authorization: Bearer VOTRE_CLE_API</span>
                <button
                  onClick={() => copyText('Authorization: Bearer VOTRE_CLE_API', 'header-bearer')}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Copier"
                >
                  {copiedKey === 'header-bearer' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SECTION ASSISTANT IA & GÉNÉRATION DE CODE INTÉGRÉE */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <span>2. Assistant IA & Générateur d'Intégration</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Copiez le Prompt IA dans ChatGPT, Claude ou Cursor pour générer l'intégration, ou utilisez nos snippets officiels.
              </p>
            </div>
            <Button
              onClick={() => copyText(aiMasterPrompt, 'ai-prompt-btn', 'Prompt IA Copié !')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shrink-0 shadow-sm"
            >
              {copiedKey === 'ai-prompt-btn' ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
              <span>Copier le Prompt IA pour Assistant</span>
            </Button>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            <Tabs defaultValue="prompt-ai" className="w-full">
              <div className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 pt-3">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2">
                  <TabsTrigger
                    value="prompt-ai"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 border border-transparent rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all"
                  >
                    Prompt IA Prêt à l'emploi
                  </TabsTrigger>
                  <TabsTrigger
                    value="typescript"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 border border-transparent rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all"
                  >
                    TypeScript / Node
                  </TabsTrigger>
                  <TabsTrigger
                    value="python"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 border border-transparent rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all"
                  >
                    Python 3
                  </TabsTrigger>
                  <TabsTrigger
                    value="curl"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 border border-transparent rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all"
                  >
                    cURL / Bash
                  </TabsTrigger>
                  <TabsTrigger
                    value="php"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 border border-transparent rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all"
                  >
                    PHP 8
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab: Prompt IA */}
              <TabsContent value="prompt-ai" className="m-0 p-6 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Mode d'emploi :</span> Collez ce prompt dans <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">ChatGPT</span>, <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">Claude</span>, <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">Cursor</span> ou <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">Lovable</span> avec votre clé API.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(aiMasterPrompt, 'tab-prompt', 'Prompt Copié !')}
                    className="text-xs shrink-0"
                  >
                    {copiedKey === 'tab-prompt' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    Copier l'intégralité du prompt
                  </Button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto border border-slate-800 max-h-[380px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{aiMasterPrompt}</pre>
                </div>
              </TabsContent>

              {/* Tab: TypeScript */}
              <TabsContent value="typescript" className="m-0 p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">Exemple ES6 / TypeScript async/await</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(tsCodeSnippet, 'tab-ts')}
                    className="text-xs"
                  >
                    {copiedKey === 'tab-ts' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    Copier le code
                  </Button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto border border-slate-800 max-h-[380px] overflow-y-auto">
                  <pre>{tsCodeSnippet}</pre>
                </div>
              </TabsContent>

              {/* Tab: Python */}
              <TabsContent value="python" className="m-0 p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">Exemple Python 3 (requests)</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(pythonCodeSnippet, 'tab-py')}
                    className="text-xs"
                  >
                    {copiedKey === 'tab-py' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    Copier le code
                  </Button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto border border-slate-800 max-h-[380px] overflow-y-auto">
                  <pre>{pythonCodeSnippet}</pre>
                </div>
              </TabsContent>

              {/* Tab: cURL */}
              <TabsContent value="curl" className="m-0 p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">Commandes Shell / cURL</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(curlCodeSnippet, 'tab-curl')}
                    className="text-xs"
                  >
                    {copiedKey === 'tab-curl' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    Copier les commandes
                  </Button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto border border-slate-800">
                  <pre>{curlCodeSnippet}</pre>
                </div>
              </TabsContent>

              {/* Tab: PHP */}
              <TabsContent value="php" className="m-0 p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">Exemple PHP 8 cURL</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(phpCodeSnippet, 'tab-php')}
                    className="text-xs"
                  >
                    {copiedKey === 'tab-php' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    Copier le code
                  </Button>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto border border-slate-800 max-h-[380px] overflow-y-auto">
                  <pre>{phpCodeSnippet}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* 3. RÉFÉRENCE DES ENDPOINTS (STRICT & MINIMALISTE) */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              3. Référence des Endpoints
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Base URL : <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900">https://api.onesms-sn.com/functions/v1/api/v1</code>
            </p>
          </div>

          <div className="space-y-6">
            {/* Endpoint 1: GET /balance */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded">
                    GET
                  </span>
                  <code className="text-base font-bold text-slate-900">/balance</code>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Consulter le solde disponible
                </span>
              </div>
              <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Retourne le solde total, le montant gelé par les activations en cours et le solde disponible pour de nouvelles activations.
                  </p>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Réponse (200 OK)</div>
                  <pre>{`{
  "balance": 1500,
  "frozen": 300,
  "available": 1200,
  "currency": "Ⓐ"
}`}</pre>
                </div>
              </div>
            </div>

            {/* Endpoint 2: GET /services */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded">
                    GET
                  </span>
                  <code className="text-base font-bold text-slate-900">/services?country=senegal</code>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Lister les services et tarifs
                </span>
              </div>
              <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Retourne la liste des services disponibles pour le pays spécifié ainsi que leur tarif en pièces Ⓐ (réduction API incluse).
                  </p>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Réponse (200 OK)</div>
                  <pre>{`{
  "count": 1,
  "discount_rate": 10,
  "services": [
    {
      "service_code": "wa",
      "service_name": "WhatsApp",
      "country": "senegal",
      "original_price": 333,
      "price": 300
    }
  ]
}`}</pre>
                </div>
              </div>
            </div>

            {/* Endpoint 3: POST /buy */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-300 px-2.5 py-1 rounded">
                    POST
                  </span>
                  <code className="text-base font-bold text-slate-900">/buy</code>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Réserver un numéro de téléphone
                </span>
              </div>
              <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Réserve un numéro pour recevoir un SMS. Les crédits sont gelés jusqu'à réception du SMS ou annulation.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-2">Body JSON</div>
                    <pre>{`{
  "service": "wa",
  "country": "senegal"
}`}</pre>
                  </div>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Réponse (200 OK)</div>
                  <pre>{`{
  "success": true,
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "phone": "221771234567",
  "service": "wa",
  "country": "senegal",
  "price": 300,
  "status": "pending",
  "expires": "2026-06-16T14:15:00.000Z"
}`}</pre>
                </div>
              </div>
            </div>

            {/* Endpoint 4: GET /status/:id */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded">
                    GET
                  </span>
                  <code className="text-base font-bold text-slate-900">/status/:id</code>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Polling du statut & réception du SMS
                </span>
              </div>
              <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Vérifie si le SMS est arrivé. À interroger toutes les 5 secondes en boucle jusqu'au statut final.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">pending</span>
                      <span className="text-slate-600">En attente de réception du SMS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">completed</span>
                      <span className="text-slate-600">SMS reçu, crédits débités</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">cancelled</span>
                      <span className="text-slate-600">Activation annulée, crédits libérés</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Réponse (200 OK)</div>
                  <pre>{`{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "sms_code": "123456",
  "sms_text": "Votre code WhatsApp est 123456.",
  "phone": "221771234567"
}`}</pre>
                </div>
              </div>
            </div>

            {/* Endpoint 5: POST /cancel/:id */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-300 px-2.5 py-1 rounded">
                    POST
                  </span>
                  <code className="text-base font-bold text-slate-900">/cancel/:id</code>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Annuler & Rembourser
                </span>
              </div>
              <div className="p-6 grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Annule immédiatement une activation en attente et libère les crédits gelés sur votre solde disponible.
                  </p>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="text-slate-400 text-[11px] uppercase tracking-wider">Réponse (200 OK)</div>
                  <pre>{`{
  "success": true,
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "cancelled",
  "refunded": 300,
  "new_balance": 1500
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. TABLEAU DES CODES D'ERREUR */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              4. Codes de Statut HTTP
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6 font-semibold text-slate-600 w-24">Code</th>
                    <th className="py-3.5 px-6 font-semibold text-slate-600 w-44">Statut</th>
                    <th className="py-3.5 px-6 font-semibold text-slate-600">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">200</td>
                    <td className="py-4 px-6 font-medium">Succès</td>
                    <td className="py-4 px-6 text-slate-600">Requête traitée avec succès.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">400</td>
                    <td className="py-4 px-6 font-medium">Bad Request</td>
                    <td className="py-4 px-6 text-slate-600">Paramètres manquants, format JSON invalide, ou stock de numéros momentanément indisponible.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">401</td>
                    <td className="py-4 px-6 font-medium">Unauthorized</td>
                    <td className="py-4 px-6 text-slate-600">Clé API absente ou invalide dans les headers (X-API-Key / Authorization Bearer).</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">402</td>
                    <td className="py-4 px-6 font-medium">Payment Required</td>
                    <td className="py-4 px-6 text-slate-600">Solde disponible insuffisant pour effectuer l'achat.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">404</td>
                    <td className="py-4 px-6 font-medium">Not Found</td>
                    <td className="py-4 px-6 text-slate-600">Activation introuvable ou n'appartenant pas à la clé API fournie.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">500</td>
                    <td className="py-4 px-6 font-medium">Server Error</td>
                    <td className="py-4 px-6 text-slate-600">Erreur interne temporaire lors du traitement de la requête.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5. TABLES DE RÉFÉRENCE (PAYS & SERVICES) */}
        <section className="pt-4">
          <ApiReferenceTables />
        </section>

      </div>
    </div>
  )
}
