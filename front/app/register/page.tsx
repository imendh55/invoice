'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Mail, Lock, Eye, EyeOff, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/config'

export default function RegisterPage() {
  const { register } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateAnniversaire: '',
    cin: '',
  })

  // Validation côté client
  const validateFields = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!formData.prenom.trim()) errors.prenom = 'Le prénom est requis.'
    if (!formData.nom.trim()) errors.nom = 'Le nom est requis.'
    if (!formData.email.trim()) {
      errors.email = "L'adresse email est requise."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Adresse email invalide.'
    }
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis.'
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères.'
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe.'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
    }

    // Champs obligatoires ajoutés
    if (!formData.dateAnniversaire) {
      errors.dateAnniversaire = "La date d'anniversaire est requise."
    }
    if (!formData.cin.trim()) {
      errors.cin = 'Le CIN est requis.'
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errors = validateFields()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await register({
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
        password: formData.password,
        dateAnniversaire: formData.dateAnniversaire,
        cin: formData.cin.trim(),
      })

      toast.success('Compte créé avec succès ! Bienvenue sur PharmaOCR.')
      window.location.href = '/login'
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && error.detail.toLowerCase().includes('email')) {
          setFieldErrors({ email: error.detail })
        } else {
          setFormError(error.detail)
        }
      } else {
        setFormError('Impossible de joindre le serveur. Vérifiez votre connexion.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value })
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
    if (formError) setFormError(null)
  }

  const getPasswordStrength = () => {
    const p = formData.password
    if (!p) return null
    if (p.length < 6) return { label: 'Trop court', color: 'text-destructive' }
    if (p.length < 8) return { label: 'Faible', color: 'text-warning' }
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { label: 'Fort', color: 'text-success' }
    return { label: 'Moyen', color: 'text-yellow-500' }
  }

  const passwordStrength = getPasswordStrength()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors">
        <FileText className="h-5 w-5" />
        <span className="font-medium">PharmaOCR</span>
      </Link>

      <div className="w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Créer un compte</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Rejoignez PharmaOCR gratuitement
          </p>

          {formError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom <span className="text-destructive">*</span></Label>
                <Input id="prenom" placeholder="Jean" value={formData.prenom} onChange={handleChange('prenom')} disabled={isLoading} />
                {fieldErrors.prenom && <p className="text-xs text-destructive">{fieldErrors.prenom}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
                <Input id="nom" placeholder="Dupont" value={formData.nom} onChange={handleChange('nom')} disabled={isLoading} />
                {fieldErrors.nom && <p className="text-xs text-destructive">{fieldErrors.nom}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="jean.dupont@exemple.com" className={`pl-10 ${fieldErrors.email ? 'border-destructive' : ''}`} value={formData.email} onChange={handleChange('email')} disabled={isLoading} />
              </div>
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 caractères" className={`pl-10 pr-10 ${fieldErrors.password ? 'border-destructive' : ''}`} value={formData.password} onChange={handleChange('password')} disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordStrength && <p className={`text-xs ${passwordStrength.color}`}>Force : {passwordStrength.label}</p>}
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Répétez votre mot de passe" className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-destructive' : ''}`} value={formData.confirmPassword} onChange={handleChange('confirmPassword')} disabled={isLoading} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password && (
                <p className={`text-xs flex items-center gap-1 ${formData.password === formData.confirmPassword ? 'text-success' : 'text-destructive'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  {formData.password === formData.confirmPassword ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                </p>
              )}
              {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Champs obligatoires */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateAnniversaire">Date d'anniversaire <span className="text-destructive">*</span></Label>
                <Input id="dateAnniversaire" type="date" value={formData.dateAnniversaire} onChange={handleChange('dateAnniversaire')} disabled={isLoading} />
                {fieldErrors.dateAnniversaire && <p className="text-xs text-destructive">{fieldErrors.dateAnniversaire}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cin">CIN <span className="text-destructive">*</span></Label>
                <Input id="cin" placeholder="AB123456" value={formData.cin} onChange={handleChange('cin')} disabled={isLoading} />
                {fieldErrors.cin && <p className="text-xs text-destructive">{fieldErrors.cin}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Création du compte...
                </span>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
