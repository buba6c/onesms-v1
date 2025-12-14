import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { signUp, signInWithGoogle } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Pré-remplit le code de parrainage depuis l'URL (?ref=CODE) et le conserve côté client
  useEffect(() => {
    const code = searchParams.get('ref') || searchParams.get('code')
    if (code) {
      setReferralCode(code)
      localStorage.setItem('pending_referral_code', code)
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedTerms) {
      toast({
        title: t('auth.acceptTermsTitle', 'Consentement requis'),
        description: t('auth.acceptTermsDesc', 'Vous devez accepter les conditions pour continuer.'),
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { data, error } = await signUp(email, password, { full_name: fullName, referral_code: referralCode || undefined })

    if (referralCode) {
      localStorage.setItem('pending_referral_code', referralCode)
    }

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    toast({
      title: t('common.success'),
      description: t('auth.accountCreatedCheckEmail'),
    })

    // Rediriger vers la page de vérification email
    navigate(`/verify-email?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.registerTitle')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="text-sm font-medium">
                {t('auth.fullName')}
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t('auth.password')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('auth.confirmPassword')}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="referralCode" className="text-sm font-medium">
                Code de parrainage (optionnel)
              </label>
              <Input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.trim())}
                placeholder="Saisissez un code ou laissez vide"
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border p-3">
              <input
                id="accept-terms"
                type="checkbox"
                className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-5">
                {t('auth.acceptTerms', 'J’accepte les Conditions d’utilisation')} {' '}
                {t('auth.and', 'et la')}{' '}
                <Link to="/privacy" className="text-primary underline underline-offset-2">
                  {t('auth.privacyPolicy', 'Politique de confidentialité')}
                </Link>
                {'.'}
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
              {loading ? 'Loading...' : t('nav.register')}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t('auth.orContinueWith')}
                </span>
              </div>
            </div>

            <Button variant="outline" onClick={handleGoogleLogin} className="w-full mt-4">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-4">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary hover:underline">
              {t('nav.login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
