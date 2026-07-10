import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase, signIn, signInWithGoogle } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { Eye, EyeOff, AlertCircle, LogIn, Mail, Lock, KeyRound } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'

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
  
  // Helper to invoke admin-2fa with retries to bypass Safari connection limits
  const invokeAdmin2FA = async (email: string | undefined, userId: string) => {
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
        const { data, error } = await supabase.functions.invoke('verify-otp', {
          body: { action: 'request', email, userId }
        });
        if (!error) return { data, error: null };
        lastError = error;
      } catch (err) {
        lastError = err;
      }
    }
    return { data: null, error: lastError };
  }

  // 2FA State
  const [show2FA, setShow2FA] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [pendingAdmin, setPendingAdmin] = useState<{ id: string, email: string } | null>(null)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
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

    if (data.user) {
      await checkAuth()
      
      const currentUser = useAuthStore.getState().user;

      toast({
        title: 'Success',
        description: 'Connexion réussie',
      })

      if (currentUser && currentUser.role === 'admin') {
        // Envoi du code 2FA par email via la Edge Function
        try {
          const { error: invokeError } = await invokeAdmin2FA(data.user.email, data.user.id);
          
          if (invokeError) {
            console.error("Failed to request 2FA:", invokeError)
            setErrorMsg("Erreur lors de l'envoi du code de vérification.")
            setLoading(false)
            return
          }
          
          setPendingAdmin({ id: data.user.id, email: data.user.email || '' })
          setShow2FA(true)
          setLoading(false)
        } catch (err) {
          console.error("Failed to request 2FA:", err)
          setErrorMsg("Erreur lors de l'envoi du code de vérification.")
          setLoading(false)
        }
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
  }

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await checkAuth()
        const currentUser = useAuthStore.getState().user;

        if (currentUser?.role === 'admin') {
          try {
            const { error: invokeError } = await invokeAdmin2FA(session.user.email, session.user.id);
            
            if (invokeError) {
               console.error("Failed to request 2FA:", invokeError)
               setErrorMsg("Erreur lors de l'envoi du code de vérification.")
               return
            }
            
            setPendingAdmin({ id: session.user.id, email: session.user.email || '' })
            setShow2FA(true)
          } catch (err) {
            console.error("Failed to request 2FA:", err)
            setErrorMsg("Erreur lors de l'envoi du code de vérification.")
          }
        } else {
          navigate('/dashboard', { replace: true })
        }
      }
    }

    handleAuthCallback()
  }, [])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingAdmin || !otpCode) return
    setVerifyingOtp(true)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { action: 'verify', userId: pendingAdmin.id, code: otpCode }
      })

      if (error || (data && !data.success)) {
        setErrorMsg("Code invalide ou expiré.")
        setVerifyingOtp(false)
        return
      }

      sessionStorage.setItem('admin_2fa_verified', 'true')
      toast({
        title: 'Success',
        description: 'Vérification 2FA réussie',
      })
      navigate('/admin')
    } catch (err) {
      setErrorMsg("Une erreur est survenue lors de la vérification.")
      setVerifyingOtp(false)
    }
  }

  if (show2FA) {
    return (
      <AuthLayout
        title="Vérification en deux étapes"
        subtitle={`Nous avons envoyé un code de vérification à ${pendingAdmin?.email}`}
      >
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          {errorMsg && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <label htmlFor="otp" className="text-sm font-medium text-gray-700">
              Code de vérification (6 chiffres)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => {
                  // Only allow numbers
                  const val = e.target.value.replace(/\D/g, '')
                  setOtpCode(val)
                  setErrorMsg(null)
                }}
                required
                className="pl-10 h-14 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl text-center tracking-[0.5em] font-mono text-2xl font-bold"
                placeholder="000000"
                maxLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all" 
            disabled={verifyingOtp || otpCode.length < 6}
          >
            {verifyingOtp ? t('common.loading', 'Loading...') : 'Vérifier le code'}
          </Button>

          <Button 
            type="button" 
            variant="ghost"
            className="w-full text-gray-500 hover:text-gray-700"
            onClick={() => {
              setShow2FA(false)
              setOtpCode('')
              setErrorMsg(null)
            }}
            disabled={verifyingOtp}
          >
            Retour à la connexion
          </Button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.loginTitle', 'Login to your account!')}
      subtitle={t('auth.loginSubtitle', 'Enter your registered email address and password to login!')}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMsg}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            {t('auth.email', 'Email')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMsg(null)
              }}
              required
              className="pl-10 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
              placeholder="eg. alex@example.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            {t('auth.password', 'Password')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMsg(null)
              }}
              required
              className="pl-10 pr-10 h-12 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
              placeholder="**************"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2">
            <input
              id="accept-terms"
              type="checkbox"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
            />
            <label htmlFor="accept-terms" className="text-sm text-gray-600 leading-snug">
              {t('auth.acceptTerms', 'J’accepte les Conditions')} {' '}
              {t('auth.and', 'et la')}{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                {t('auth.privacyPolicy', 'Politique de confidentialité')}
              </Link>
            </label>
          </div>

          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors whitespace-nowrap"
          >
            {t('auth.forgotPassword', 'Forgot Password ?')}
          </Link>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all" 
          disabled={loading || !acceptedTerms}
        >
          {loading ? t('common.loading', 'Loading...') : t('nav.login', 'Login')}
        </Button>
      </form>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">
              {t('auth.orLoginWith', 'Or login with')}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleGoogleLogin}
            className="flex justify-center items-center h-12 w-full max-w-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-gray-700"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
        <Link 
          to="/register" 
          className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
        >
          {t('nav.register', 'Register here')}
        </Link>
      </p>
    </AuthLayout>
  )
}
