'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, User, FileText, X,
  Loader2, Hash, Building2, ArrowRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL, getHeaders, handleApiResponse } from '@/lib/api/config'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────
interface SearchResult {
  id: number
  fileName: string
  status: string
  extractedData?: {
    fournisseur?: string
    numeroFacture?: string
    totalTTC?: number
    date?: string
  }
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  uploaded:  'bg-blue-500/15 text-blue-600',
  extracted: 'bg-purple-500/15 text-purple-600',
  validated: 'bg-green-500/15 text-green-600',
  rejected:  'bg-red-500/15 text-red-600',
  en_cours:  'bg-yellow-500/15 text-yellow-600',
}

const STATUS_LABELS: Record<string, string> = {
  uploaded:  'Uploadée',
  extracted: 'Extraite',
  validated: 'Validée',
  rejected:  'Rejetée',
  en_cours:  'En cours',
}

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const { user, logout, token } = useAuth()
  const router = useRouter()

  // État de la recherche
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [totalFound, setTotalFound]   = useState(0)

  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Fermer le dropdown en cliquant dehors ────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Raccourci clavier Ctrl+K / Cmd+K ────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setShowDropdown(true)
      }
      if (e.key === 'Escape') {
        setShowDropdown(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Recherche avec debounce ──────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!token || q.trim().length < 1) {
      setResults([])
      setTotalFound(0)
      setShowDropdown(q.length > 0)
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        keyword: q.trim(),
        limit:   '6',
        page:    '1',
      })
      const res  = await fetch(`${API_BASE_URL}/invoices/search/advanced?${params}`, {
        headers: getHeaders(token),
      })
      const data = await handleApiResponse<any>(res)
      setResults(data.items ?? [])
      setTotalFound(data.total ?? 0)
      setShowDropdown(true)
    } catch {
      setResults([])
      setTotalFound(0)
    } finally {
      setIsSearching(false)
    }
  }, [token])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  // ── Actions ─────────────────────────────────────────
  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const goToResult = (id: number) => {
    setShowDropdown(false)
    setQuery('')
    router.push(`/dashboard/invoice/${id}`)
  }

  const goToFullSearch = () => {
    if (!query.trim()) return
    setShowDropdown(false)
    router.push(`/dashboard/history?keyword=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') goToFullSearch()
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6 gap-4">

      {/* ── Barre de recherche globale ─────────────────── */}
      <div ref={containerRef} className="relative w-full max-w-lg">
        <div className="relative">
          {isSearching
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          }
          <Input
            ref={inputRef}
            type="search"
            placeholder="Rechercher une facture… (Ctrl+K)"
            className="pl-10 pr-20 bg-muted/50 focus:bg-background transition-colors"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => query && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query ? (
              <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] text-muted-foreground font-mono">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {/* ── Dropdown résultats ───────────────────────── */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border bg-popover shadow-xl overflow-hidden z-50">

            {/* Aucun résultat */}
            {!isSearching && query.trim() && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Aucune facture trouvée pour <strong>&quot;{query}&quot;</strong>
              </div>
            )}

            {/* Résultats */}
            {results.length > 0 && (
              <div>
                <div className="px-3 py-2 border-b bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {totalFound} résultat{totalFound !== 1 ? 's' : ''} trouvé{totalFound !== 1 ? 's' : ''}
                  </p>
                </div>

                <ul>
                  {results.map((inv, idx) => (
                    <li key={inv.id}>
                      <button
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors',
                          'flex items-start gap-3',
                          idx !== results.length - 1 && 'border-b border-border/40'
                        )}
                        onClick={() => goToResult(inv.id)}
                      >
                        {/* Icône */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>

                        {/* Infos principale */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{inv.fileName}</p>
                            <span className={cn(
                              'shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                              STATUS_COLORS[inv.status] ?? 'bg-muted text-muted-foreground'
                            )}>
                              {STATUS_LABELS[inv.status] ?? inv.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Hash className="h-3 w-3" />
                              #{inv.id}
                            </span>
                            {inv.extractedData?.fournisseur && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {inv.extractedData.fournisseur}
                              </span>
                            )}
                            {inv.extractedData?.totalTTC && (
                              <span className="text-xs font-medium text-foreground/70 shrink-0">
                                {inv.extractedData.totalTTC.toFixed(2)} €
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Voir tous les résultats */}
                {totalFound > 6 && (
                  <button
                    className="w-full px-4 py-2.5 border-t bg-muted/30 hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-primary"
                    onClick={goToFullSearch}
                  >
                    <Search className="h-3.5 w-3.5" />
                    Voir les {totalFound} résultats dans l&apos;historique
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Indice de recherche quand le champ est vide */}
            {!query && (
              <div className="px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Conseils de recherche
                </p>
                {[
                  { icon: <Hash className="h-3.5 w-3.5" />,      text: 'Rechercher par ID : tapez 42' },
                  { icon: <FileText className="h-3.5 w-3.5" />,   text: 'Nom de fichier : facture1.pdf' },
                  { icon: <Building2 className="h-3.5 w-3.5" />,  text: 'Fournisseur : Pharma Distribution' },
                  { icon: <Search className="h-3.5 w-3.5" />,     text: 'N° facture : FAC-2024-001' },
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/60">{tip.icon}</span>
                    {tip.text}
                  </div>
                ))}
                <div className="pt-2 border-t mt-3">
                  <Link
                    href="/dashboard/history"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Search className="h-3 w-3" />
                    Accéder à la recherche avancée
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Partie droite ─────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {user ? `${user.prenom[0]}${user.nom[0]}` : <User className="h-4 w-4" />}
              </div>
              <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.prenom} {user?.nom}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    Administrateur
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive cursor-pointer focus:text-destructive"
            >
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
