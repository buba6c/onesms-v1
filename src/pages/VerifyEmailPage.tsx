import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { resendConfirmationEmail } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Mail, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  
  const emailFromParams = searchParams.get('email') || ''
  const [email, setEmail] = useState(emailFromParams)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: t('common.error'),
        description: t('auth.enterEmail'),
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { error } = await resendConfirmationEmail(email)

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    setResent(true)
    setLoading(false)
    
    toast({
      title: t('common.success'),
      description: t('auth.confirmationEmailResent'),
    })

    // Reset après 10 secondes pour permettre de renvoyer
    setTimeout(() => setResent(false), 10000)
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle>{t('auth.verifyEmailTitle')}</CardTitle>
          <CardDescription>
            {t('auth.verifyEmailDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <p className="text-sm">{t('auth.verifyStep1')}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <p className="text-sm">{t('auth.verifyStep2')}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <p className="text-sm">{t('auth.verifyStep3')}</p>
            </div>
          </div>

          {/* Resend form */}
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t('auth.yourEmail')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              variant="outline" 
              className="w-full" 
              disabled={loading || resent}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : resent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  {t('auth.emailResent')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('auth.resendConfirmation')}
                </>
              )}
            </Button>
          </form>

          {/* Info spam */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p className="font-medium">{t('auth.checkSpamFolder')}</p>
          </div>

          {/* Back to login */}
          <div className="text-center pt-2">
            <Link 
              to="/login" 
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
