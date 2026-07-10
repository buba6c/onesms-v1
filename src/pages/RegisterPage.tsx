import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signUp, signInWithGoogle, checkEmailExists } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Mail, Lock, User, Tag, EyeOff, Eye } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

    // Vérifier d'abord si l'email existe déjà
    const emailExists = await checkEmailExists(email)
    
    if (emailExists) {
      toast({
        title: t('auth.accountExistsTitle'),
        description: t('auth.accountExistsDescription'),
        variant: 'destructive',
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/login')}
            className="ml-auto"
          >
            {t('nav.login')}
          </Button>
        ),
      })
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password, { full_name: fullName, referral_code: referralCode || undefined })

    if (referralCode) {
      localStorage.setItem('pending_referral_code', referralCode)
    }

    if (error) {
      // Vérifier si l'erreur est due à un utilisateur existant
      if (error.message.includes('User already registered') || 
          error.message.includes('already been registered') ||
          error.message.includes('Email already exists') ||
          error.message.includes('duplicate key')) {
        toast({
          title: t('auth.accountExistsTitle'),
          description: t('auth.accountExistsDescription'),
          variant: 'destructive',
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/login')}
              className="ml-auto"
            >
              {t('nav.login')}
            </Button>
          ),
        })
      } else {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        })
      }
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
    <AuthLayout
      title={t('auth.registerTitle', 'Create an account')}
      subtitle={t('auth.registerSubtitle', 'Join us today! Enter your details to get started.')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
            {t('auth.fullName', 'Full Name')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="pl-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
              placeholder="eg. Alex Doe"
            />
          </div>
        </div>

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
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
              placeholder="eg. alex@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
                placeholder="********"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              {t('auth.confirmPassword', 'Confirm Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 pr-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
                placeholder="********"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="referralCode" className="text-sm font-medium text-gray-700">
            {t('auth.referralCode', 'Code de parrainage (optionnel)')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="referralCode"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.trim())}
              className="pl-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl"
              placeholder="Code de parrainage"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            id="accept-terms"
            type="checkbox"
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
          <label htmlFor="accept-terms" className="text-sm text-gray-600 leading-snug">
            {t('auth.acceptTerms', 'J’accepte les Conditions d’utilisation')} {' '}
            {t('auth.and', 'et la')}{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">
              {t('auth.privacyPolicy', 'Politique de confidentialité')}
            </Link>
            {'.'}
          </label>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all mt-4" 
          disabled={loading || !acceptedTerms}
        >
          {loading ? t('common.loading', 'Loading...') : t('nav.register', 'Register')}
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">
              {t('auth.orContinueWith', 'Or continue with')}
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

      <p className="text-center text-sm text-gray-500 mt-6">
        {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
        <Link 
          to="/login" 
          className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
        >
          {t('nav.login', 'Login here')}
        </Link>
      </p>
    </AuthLayout>
  )
}
