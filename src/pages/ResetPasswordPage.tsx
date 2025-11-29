import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { updatePassword, supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Vérifier la session au chargement (l'utilisateur arrive via le lien email)
  useEffect(() => {
    const checkSession = async () => {
      // Supabase gère automatiquement le token dans l'URL
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsValidSession(true)
      } else {
        // Attendre un peu car Supabase peut prendre du temps à traiter le token
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          setIsValidSession(!!retrySession)
          setCheckingSession(false)
        }, 1000)
        return
      }
      setCheckingSession(false)
    }
    
    checkSession()

    // Écouter les changements d'auth (quand le token est traité)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
        setCheckingSession(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordsDontMatch'),
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { error } = await updatePassword(password)

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Rediriger vers login après 3 secondes
    setTimeout(() => {
      navigate('/login')
    }, 3000)
  }

  if (checkingSession) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">{t('auth.invalidResetLink')}</CardTitle>
            <CardDescription>
              {t('auth.invalidResetLinkDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/forgot-password')} 
              className="w-full"
            >
              {t('auth.requestNewLink')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">{t('auth.passwordUpdated')}</CardTitle>
            <CardDescription>
              {t('auth.passwordUpdatedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {t('auth.redirectingToLogin')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
          <CardDescription>
            {t('auth.resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {t('auth.newPassword')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('auth.confirmNewPassword')}
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t('auth.updatePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
