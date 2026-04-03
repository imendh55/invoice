'use client'

import Link from 'next/link'
import { FileText, Zap, Shield, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with Background */}
      <div 
        className="relative min-h-screen flex flex-col"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Navigation */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-white">PharmaOCR</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-white/80 hover:text-white transition-colors">
              Accueil
            </Link>
            <Link href="#about" className="text-white/80 hover:text-white transition-colors">
              A propos
            </Link>
            <Link href="#services" className="text-white/80 hover:text-white transition-colors">
              Services
            </Link>
            <Link href="#contact" className="text-white/80 hover:text-white transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">
                S&apos;inscrire
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl font-bold text-white md:text-6xl lg:text-7xl max-w-4xl text-balance">
            BIENVENUE
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl leading-relaxed">
            Bienvenue sur notre plateforme d&apos;OCR intelligent, conçue pour transformer 
            vos images et documents en texte exploitable de manière simple, rapide et précise.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="services" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Nos Services</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Une solution complète pour la gestion et le traitement de vos factures
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              title="Import Factures"
              description="Importez vos factures en PDF ou image par simple glisser-déposer"
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="OCR Intelligent"
              description="Extraction automatique des données grâce à l'intelligence artificielle"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Validation"
              description="Vérifiez et validez les données extraites avec un score de confiance"
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Analyse"
              description="Tableau de bord complet avec statistiques et historique"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">A propos de PharmaOCR</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            PharmaOCR est une solution innovante développée spécialement pour les pharmacies. 
            Notre plateforme utilise les dernières technologies d&apos;OCR et d&apos;intelligence artificielle 
            pour automatiser le traitement de vos factures fournisseurs, vous faisant gagner 
            un temps précieux dans votre gestion quotidienne.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t bg-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">PharmaOCR</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 PharmaOCR. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border hover:shadow-lg transition-shadow">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
