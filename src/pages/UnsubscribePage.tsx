import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { Alert, AlertDescription } from '@/components/ui/alert'

export default function UnsubscribePage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Ici tu peux ajouter une logique pour marquer l'utilisateur comme désinscrit
      // Pour l'instant, on simule juste un succès
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Désinscription des emails</CardTitle>
          <CardDescription>
            Vous ne recevrez plus d'emails promotionnels de One SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
              <p className="text-green-800">
                ✅ Vous avez été désinscrit avec succès. Vous ne recevrez plus d'emails promotionnels.
                <br /><br />
                Note: Vous continuerez à recevoir les emails de confirmation de transactions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Désinscription...' : 'Se désabonner'}
              </Button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:underline"
            >
              ← Retour à One SMS
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}