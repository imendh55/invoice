'use client'

import { useState } from 'react'
import { User, Lock, Globe, Palette, Save, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { currentUser } from '@/lib/mock-data'
import type { OCRSettings } from '@/lib/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    nom: currentUser.nom,
    prenom: currentUser.prenom,
    email: currentUser.email,
    dateAnniversaire: currentUser.dateAnniversaire || '',
    cin: currentUser.cin || '',
  })

  const [preferences, setPreferences] = useState({
    language: 'fr',
    theme: 'light',
  })

  const [ocrSettings, setOcrSettings] = useState<OCRSettings>({
    confidenceThreshold: 80,
    language: 'fr',
    documentType: 'facture',
    preprocessing: {
      improveContrast: true,
      removeNoise: true,
    },
    ocrEngine: 'tesseract',
  })

  const handleSaveProfile = () => {
    // In a real app, this would save to the database
    alert('Profil sauvegardé')
  }

  const handleSaveOCR = () => {
    // In a real app, this would save to the database
    alert('Paramètres OCR sauvegardés')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre profil et les paramètres de l&apos;application</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="ocr" className="gap-2">
            <Settings className="h-4 w-4" />
            Paramètres OCR
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Modifiez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={profile.prenom}
                    onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={profile.nom}
                    onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateAnniversaire">Date anniversaire</Label>
                  <Input
                    id="dateAnniversaire"
                    type="date"
                    value={profile.dateAnniversaire}
                    onChange={(e) => setProfile({ ...profile, dateAnniversaire: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cin">CIN</Label>
                  <Input
                    id="cin"
                    value={profile.cin}
                    onChange={(e) => setProfile({ ...profile, cin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Input value={currentUser.role} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Gérez votre mot de passe et la sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer mot de passe</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <Button variant="outline">
                Changer mot de passe
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Préférences
              </CardTitle>
              <CardDescription>
                Personnalisez l&apos;interface de l&apos;application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select value={preferences.language} onValueChange={(v) => setPreferences({ ...preferences, language: v })}>
                  <SelectTrigger>
                    <Globe className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={preferences.theme} onValueChange={(v) => setPreferences({ ...preferences, theme: v })}>
                  <SelectTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="system">Système</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </TabsContent>

        {/* OCR Settings Tab */}
        <TabsContent value="ocr" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres OCR</CardTitle>
              <CardDescription>
                Configurez les options de reconnaissance optique de caractères
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Confidence Threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Seuil de confiance</Label>
                  <span className="text-sm font-medium">{ocrSettings.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[ocrSettings.confidenceThreshold]}
                  onValueChange={(value) => setOcrSettings({ ...ocrSettings, confidenceThreshold: value[0] })}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Les extractions avec un score inférieur nécessiteront une validation manuelle
                </p>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Langue du document</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="lang-fr"
                      name="language"
                      checked={ocrSettings.language === 'fr'}
                      onChange={() => setOcrSettings({ ...ocrSettings, language: 'fr' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="lang-fr" className="font-normal">Français</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="lang-en"
                      name="language"
                      checked={ocrSettings.language === 'en'}
                      onChange={() => setOcrSettings({ ...ocrSettings, language: 'en' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="lang-en" className="font-normal">Anglais</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="lang-ar"
                      name="language"
                      checked={ocrSettings.language === 'ar'}
                      onChange={() => setOcrSettings({ ...ocrSettings, language: 'ar' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="lang-ar" className="font-normal">Arabe</Label>
                  </div>
                </div>
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <Label>Type de document</Label>
                <Select
                  value={ocrSettings.documentType}
                  onValueChange={(v: 'facture' | 'bon_livraison' | 'autre') => setOcrSettings({ ...ocrSettings, documentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facture">Facture</SelectItem>
                    <SelectItem value="bon_livraison">Bon de livraison</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preprocessing */}
              <div className="space-y-4">
                <Label>Prétraitement</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contrast"
                      checked={ocrSettings.preprocessing.improveContrast}
                      onCheckedChange={(checked) => 
                        setOcrSettings({
                          ...ocrSettings,
                          preprocessing: { ...ocrSettings.preprocessing, improveContrast: !!checked }
                        })
                      }
                    />
                    <Label htmlFor="contrast" className="font-normal">Améliorer contraste</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noise"
                      checked={ocrSettings.preprocessing.removeNoise}
                      onCheckedChange={(checked) => 
                        setOcrSettings({
                          ...ocrSettings,
                          preprocessing: { ...ocrSettings.preprocessing, removeNoise: !!checked }
                        })
                      }
                    />
                    <Label htmlFor="noise" className="font-normal">Supprimer bruit</Label>
                  </div>
                </div>
              </div>

              {/* OCR Engine */}
              <div className="space-y-2">
                <Label>Moteur OCR</Label>
                <Select value={ocrSettings.ocrEngine} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tesseract">Tesseract</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tesseract.js est utilisé pour le traitement OCR côté client
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveOCR}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
