'use client'

import { useState, useEffect } from 'react'
import {
  User, Lock, Globe, Palette, Save,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { updateProfile, changePassword } from '@/lib/api/auth'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/config'

export default function SettingsPage() {
  const { user, token, updateUser } = useAuth()

  // ── État profil ──────────────────────────────────────────
  const [profile, setProfile] = useState({
    nom:              '',
    prenom:           '',
    email:            '',
    dateAnniversaire: '',
    cin:              '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError]       = useState<string | null>(null)

  // ── État mot de passe ────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [showCurrent, setShowCurrent]   = useState(false)
  const [showNew, setShowNew]           = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isSavingPwd, setIsSavingPwd]   = useState(false)
  const [pwdError, setPwdError]         = useState<string | null>(null)
  const [pwdFieldErrors, setPwdFieldErrors] = useState<Record<string, string>>({})

  // ── Charger les données utilisateur ─────────────────────
  useEffect(() => {
    if (user) {
      setProfile({
        nom:              user.nom              ?? '',
        prenom:           user.prenom           ?? '',
        email:            user.email            ?? '',
        dateAnniversaire: (user as any).dateAnniversaire ?? '',
        cin:              (user as any).cin              ?? '',
      })
    }
  }, [user])

  // ── Indicateur force mot de passe ───────────────────────
  const getPasswordStrength = (p: string) => {
    if (!p) return null
    if (p.length < 6)                              return { label: 'Trop court', color: 'text-destructive', width: '20%' }
    if (p.length < 8)                              return { label: 'Faible',     color: 'text-orange-500',  width: '40%' }
    if (/[A-Z]/.test(p) && /[0-9]/.test(p))       return { label: 'Fort',       color: 'text-green-600',   width: '100%' }
    return                                                { label: 'Moyen',      color: 'text-yellow-500',  width: '65%' }
  }
  const pwdStrength = getPasswordStrength(passwords.newPassword)

  // ── Sauvegarder le profil ────────────────────────────────
  const handleSaveProfile = async () => {
    if (!token) return
    if (!profile.nom.trim() || !profile.prenom.trim()) {
      setProfileError('Le nom et le prénom sont requis.')
      return
    }
    setProfileError(null)
    setIsSavingProfile(true)
    try {
      const updated = await updateProfile(token, {
        nom:              profile.nom.trim(),
        prenom:           profile.prenom.trim(),
        dateAnniversaire: profile.dateAnniversaire || undefined,
        cin:              profile.cin.trim() || undefined,
      })
      updateUser(updated)
      toast.success('Profil mis à jour avec succès')
    } catch (e) {
      if (e instanceof ApiError) setProfileError(e.detail)
      else setProfileError('Erreur lors de la sauvegarde')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ── Changer le mot de passe ──────────────────────────────
  const handleChangePassword = async () => {
    if (!token) return

    const errors: Record<string, string> = {}
    if (!passwords.currentPassword) errors.currentPassword = 'Requis'
    if (!passwords.newPassword)     errors.newPassword     = 'Requis'
    else if (passwords.newPassword.length < 6)
      errors.newPassword = 'Au moins 6 caractères'
    if (!passwords.confirmPassword) errors.confirmPassword = 'Requis'
    else if (passwords.newPassword !== passwords.confirmPassword)
      errors.confirmPassword = 'Les mots de passe ne correspondent pas'

    if (Object.keys(errors).length > 0) {
      setPwdFieldErrors(errors)
      return
    }

    setPwdFieldErrors({})
    setPwdError(null)
    setIsSavingPwd(true)

    try {
      await changePassword(token, {
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      })
      toast.success('Mot de passe modifié avec succès')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      if (e instanceof ApiError) setPwdError(e.detail)
      else setPwdError('Erreur lors du changement de mot de passe')
    } finally {
      setIsSavingPwd(false)
    }
  }

  const handlePwdChange = (field: keyof typeof passwords) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswords({ ...passwords, [field]: e.target.value })
      if (pwdFieldErrors[field]) setPwdFieldErrors({ ...pwdFieldErrors, [field]: '' })
      if (pwdError) setPwdError(null)
    }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre profil et la sécurité de votre compte
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4" />
            Préférences
          </TabsTrigger>
        </TabsList>

        {/* ── ONGLET PROFIL ───────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6">

          {/* Avatar + rôle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shrink-0">
                  {user ? `${user.prenom[0]}${user.nom[0]}` : '?'}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {user?.prenom} {user?.nom}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge
                    variant={user?.role === 'admin' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {profileError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">Prénom <span className="text-destructive">*</span></Label>
                  <Input
                    id="prenom"
                    value={profile.prenom}
                    onChange={e => setProfile({ ...profile, prenom: e.target.value })}
                    disabled={isSavingProfile}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom <span className="text-destructive">*</span></Label>
                  <Input
                    id="nom"
                    value={profile.nom}
                    onChange={e => setProfile({ ...profile, nom: e.target.value })}
                    disabled={isSavingProfile}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié depuis cette interface.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dateAnniversaire">Date anniversaire</Label>
                  <Input
                    id="dateAnniversaire"
                    type="date"
                    value={profile.dateAnniversaire}
                    onChange={e => setProfile({ ...profile, dateAnniversaire: e.target.value })}
                    disabled={isSavingProfile}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cin">CIN</Label>
                  <Input
                    id="cin"
                    placeholder="AB123456"
                    value={profile.cin}
                    onChange={e => setProfile({ ...profile, cin: e.target.value })}
                    disabled={isSavingProfile}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Input
                  value={user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</>
                    : <><Save className="mr-2 h-4 w-4" />Sauvegarder</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ONGLET SÉCURITÉ ─────────────────────────────── */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" />
                Changer le mot de passe
              </CardTitle>
              <CardDescription>
                Choisissez un mot de passe fort d'au moins 6 caractères
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {pwdError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {pwdError}
                </div>
              )}

              {/* Mot de passe actuel */}
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">
                  Mot de passe actuel <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Votre mot de passe actuel"
                    className={`pr-10 ${pwdFieldErrors.currentPassword ? 'border-destructive' : ''}`}
                    value={passwords.currentPassword}
                    onChange={handlePwdChange('currentPassword')}
                    disabled={isSavingPwd}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwdFieldErrors.currentPassword && (
                  <p className="text-xs text-destructive">{pwdFieldErrors.currentPassword}</p>
                )}
              </div>

              {/* Nouveau mot de passe */}
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">
                  Nouveau mot de passe <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Min. 6 caractères"
                    className={`pr-10 ${pwdFieldErrors.newPassword ? 'border-destructive' : ''}`}
                    value={passwords.newPassword}
                    onChange={handlePwdChange('newPassword')}
                    disabled={isSavingPwd}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwdStrength && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: pwdStrength.width,
                          backgroundColor:
                            pwdStrength.label === 'Fort'  ? '#16a34a' :
                            pwdStrength.label === 'Moyen' ? '#eab308' :
                            pwdStrength.label === 'Faible'? '#f97316' : '#dc2626'
                        }}
                      />
                    </div>
                    <p className={`text-xs font-medium ${pwdStrength.color}`}>
                      Force : {pwdStrength.label}
                    </p>
                  </div>
                )}
                {pwdFieldErrors.newPassword && (
                  <p className="text-xs text-destructive">{pwdFieldErrors.newPassword}</p>
                )}
              </div>

              {/* Confirmer */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">
                  Confirmer le nouveau mot de passe <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Répétez votre nouveau mot de passe"
                    className={`pr-10 ${pwdFieldErrors.confirmPassword ? 'border-destructive' : ''}`}
                    value={passwords.confirmPassword}
                    onChange={handlePwdChange('confirmPassword')}
                    disabled={isSavingPwd}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwords.confirmPassword && passwords.newPassword && (
                  <p className={`text-xs flex items-center gap-1 ${
                    passwords.newPassword === passwords.confirmPassword
                      ? 'text-green-600' : 'text-destructive'
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {passwords.newPassword === passwords.confirmPassword
                      ? 'Les mots de passe correspondent'
                      : 'Les mots de passe ne correspondent pas'}
                  </p>
                )}
                {pwdFieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{pwdFieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleChangePassword} disabled={isSavingPwd}>
                  {isSavingPwd
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Modification...</>
                    : <><Lock className="mr-2 h-4 w-4" />Changer le mot de passe</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Infos session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Compte créé le</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Rôle du compte</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role === 'admin'
                      ? 'Accès complet à l\'administration'
                      : 'Accès standard au dashboard'}
                  </p>
                </div>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  {user?.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ONGLET PRÉFÉRENCES ──────────────────────────── */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Langue et région
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Langue de l'interface</Label>
                <div className="flex gap-2">
                  {['Français', 'English', 'العربية'].map((lang) => (
                    <button
                      key={lang}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        lang === 'Français'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Le support multilingue complet sera disponible prochainement.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Apparence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Thème</Label>
                <div className="flex gap-3">
                  {[
                    { label: 'Clair',   value: 'light', icon: '☀️' },
                    { label: 'Sombre',  value: 'dark',  icon: '🌙' },
                    { label: 'Système', value: 'system',icon: '💻' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border text-sm transition-colors ${
                        theme.value === 'light'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      <span className="text-lg">{theme.icon}</span>
                      {theme.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  La personnalisation du thème sera disponible prochainement.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
