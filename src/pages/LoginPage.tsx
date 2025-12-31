import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase, signIn, signInWithGoogle } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { checkAuth, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!acceptedTerms) {
      setErrorMsg(t('auth.acceptTermsDesc', 'Vous devez accepter les conditions pour continuer.'))
      return
    }
    setLoading(true)

    const { data, error } = await signIn(email, password)

    if (error) {
      console.error("Login error:", error)
      setErrorMsg("Email ou mot de passe incorrect. Veuillez réessayer.")
      setLoading(false)
      return
    }

    // Récupérer le profil utilisateur pour vérifier le rôle
    if (data.user) {
      // ✅ Attendre que checkAuth termine pour mettre à jour le store
      await checkAuth()

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single() as { data: { role: string } | null; error: any };

      toast({
        title: 'Success',
        description: 'Connexion réussie',
      })

      // Rediriger selon le rôle
      if (userData && userData.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } else {
      await checkAuth()
      navigate('/dashboard')
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) {
      setErrorMsg(error.message)
    }
    // Google OAuth redirige automatiquement, pas besoin de navigate ici
  }

  // Gérer le retour du callback OAuth
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        console.log('✅ [LOGIN] OAuth session detected, fetching user profile...')

        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Update auth store
        setUser({
          ...session.user,
          role: profile?.role || 'user'
        })

        // Redirect based on role
        if (profile?.role === 'admin') {
          navigate('/admin', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {errorMsg && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMsg}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMsg(null)
                }}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrorMsg(null)
                  }}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  </span>
                </Button>
              </div>
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
                <a
                  href="http://localhost:3001/privacy"
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('auth.privacyPolicy', 'Politique de confidentialité')}
                </a>
                {'.'}
              </label>
            </div>

            {/* Forgot password link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
              {loading ? t('common.loading') : t('nav.login')}
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
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-4">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="text-primary hover:underline">
              {t('nav.register')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
