'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye, Trash2, Edit, Search, UserPlus, X,
  ChevronLeft, ChevronRight, Shield, User as UserIcon,
  Loader2, AlertCircle, Check, RefreshCw, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth-context'
import * as adminApi from '@/lib/api/admin'
import { ApiError } from '@/lib/api/config'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────
type AdminUser = adminApi.AdminUser

const emptyCreate = (): adminApi.CreateUserRequest => ({
  nom: '', prenom: '', email: '',
  password: '', role: 'user',
  dateAnniversaire: '', cin: '',
})

const emptyEdit = (): adminApi.UpdateUserRequest => ({
  nom: '', prenom: '', role: 'user',
  dateAnniversaire: '', cin: '',
})

// ─── Page principale ───────────────────────────────────────
export default function UsersAdminPage() {
  const { token } = useAuth()

  // État liste
  const [users, setUsers]             = useState<AdminUser[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [page, setPage]               = useState(1)
  const [isLoading, setIsLoading]     = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter]   = useState('all')

  // État dialogs
  const [addOpen, setAddOpen]         = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [viewOpen, setViewOpen]       = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)

  // État formulaires
  const [newUser, setNewUser]           = useState(emptyCreate())
  const [editData, setEditData]         = useState(emptyEdit())
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isSaving, setIsSaving]         = useState(false)
  const [formError, setFormError]       = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // ── Chargement ─────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await adminApi.getUsers(token, {
        page,
        limit: 10,
        search: searchQuery.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      })
      setUsers(res.items)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error('Accès refusé — section réservée aux administrateurs')
      } else {
        toast.error('Impossible de charger les utilisateurs')
      }
    } finally {
      setIsLoading(false)
    }
  }, [token, page, searchQuery, roleFilter])

  // Debounce recherche + filtre
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadUsers() }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, roleFilter])

  // Rechargement sur changement de page
  useEffect(() => { loadUsers() }, [page])

  // ── Ajouter ────────────────────────────────────────────
  const validateCreate = (): string | null => {
    if (!newUser.prenom.trim() || !newUser.nom.trim())
      return 'Prénom et nom sont requis.'
    if (!newUser.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email))
      return 'Adresse email invalide.'
    if (!newUser.password || newUser.password.length < 6)
      return 'Le mot de passe doit contenir au moins 6 caractères.'
    return null
  }

  const handleAdd = async () => {
    const err = validateCreate()
    if (err) { setFormError(err); return }
    setFormError(null)
    setIsSaving(true)
    try {
      const created = await adminApi.createUser(token!, {
        ...newUser,
        dateAnniversaire: newUser.dateAnniversaire || undefined,
        cin: newUser.cin || undefined,
      })
      toast.success(`✅ ${created.prenom} ${created.nom} créé avec succès`)
      setAddOpen(false)
      setNewUser(emptyCreate())
      setPage(1)
      loadUsers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : 'Erreur lors de la création')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Éditer ─────────────────────────────────────────────
  const openEdit = (user: AdminUser) => {
    setSelectedUser(user)
    setEditData({
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      dateAnniversaire: user.dateAnniversaire || '',
      cin: user.cin || '',
    })
    setFormError(null)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!selectedUser || !token) return
    if (!editData.nom?.trim() || !editData.prenom?.trim()) {
      setFormError('Prénom et nom sont requis.')
      return
    }
    setFormError(null)
    setIsSaving(true)
    try {
      const updated = await adminApi.updateUser(token, selectedUser.id, {
        ...editData,
        dateAnniversaire: editData.dateAnniversaire || undefined,
        cin: editData.cin || undefined,
      })
      toast.success(`✅ ${updated.prenom} ${updated.nom} mis à jour`)
      setEditOpen(false)
      loadUsers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : 'Erreur lors de la mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Supprimer ──────────────────────────────────────────
  const openDelete = (user: AdminUser) => { setSelectedUser(user); setDeleteOpen(true) }

  const handleDelete = async () => {
    if (!selectedUser || !token) return
    try {
      await adminApi.deleteUser(token, selectedUser.id)
      toast.success(`${selectedUser.prenom} ${selectedUser.nom} supprimé`)
      setDeleteOpen(false)
      if (users.length === 1 && page > 1) setPage(p => p - 1)
      else loadUsers()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : 'Erreur lors de la suppression')
      setDeleteOpen(false)
    }
  }

  // ── Rendu ──────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Chargement...' : `${total} utilisateur${total !== 1 ? 's' : ''} au total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadUsers} title="Actualiser">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setFormError(null); setNewUser(emptyCreate()); setShowPassword(false); setAddOpen(true) }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter utilisateur
          </Button>
        </div>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Liste des utilisateurs</CardTitle>
            <div className="flex items-center gap-2">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Nom, email..."
                  className="pl-10 w-[200px]"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filtre rôle */}
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="admin">Administrateurs</SelectItem>
                  <SelectItem value="user">Utilisateurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date Anniv.</TableHead>
                    <TableHead>CIN</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        <UserIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        Aucun utilisateur trouvé
                        {searchQuery && (
                          <p className="text-sm mt-1">
                            pour la recherche &quot;{searchQuery}&quot;
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(user => (
                      <TableRow key={user.id} className="group">
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          #{user.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                              {user.prenom[0]}{user.nom[0]}
                            </div>
                            <span className="font-medium">
                              {user.prenom} {user.nom}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.dateAnniversaire || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.cin || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {user.role === 'admin'
                              ? <Shield className="h-3 w-3" />
                              : <UserIcon className="h-3 w-3" />
                            }
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title="Voir le détail"
                              onClick={() => { setSelectedUser(user); setViewOpen(true) }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title="Modifier"
                              onClick={() => openEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Supprimer"
                              onClick={() => openDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages} — {total} résultat{total !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
                    </Button>
                    {/* Numéros de page */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = i + 1
                        return (
                          <Button
                            key={p}
                            variant={page === p ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Suivant <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ══ DIALOG : AJOUTER ══════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={o => { setAddOpen(o); if (!o) setFormError(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>Créez un nouveau compte utilisateur dans le système</DialogDescription>
          </DialogHeader>

          <FormError message={formError} />

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required>
                <Input
                  placeholder="Jean"
                  value={newUser.prenom}
                  onChange={e => setNewUser({ ...newUser, prenom: e.target.value })}
                  autoFocus
                />
              </Field>
              <Field label="Nom" required>
                <Input
                  placeholder="Dupont"
                  value={newUser.nom}
                  onChange={e => setNewUser({ ...newUser, nom: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Adresse email" required>
              <Input
                type="email"
                placeholder="jean.dupont@pharmacie.com"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            </Field>

            <Field label="Mot de passe" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 caractères"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="pr-16"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(s => !s)}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              {newUser.password && (
                <PasswordStrength password={newUser.password} />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date anniversaire">
                <Input
                  type="date"
                  value={newUser.dateAnniversaire}
                  onChange={e => setNewUser({ ...newUser, dateAnniversaire: e.target.value })}
                />
              </Field>
              <Field label="CIN">
                <Input
                  placeholder="AB123456"
                  value={newUser.cin}
                  onChange={e => setNewUser({ ...newUser, cin: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Rôle">
              <Select
                value={newUser.role}
                onValueChange={v => setNewUser({ ...newUser, role: v as 'admin' | 'user' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" /> Utilisateur
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Administrateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
                : <><Check className="mr-2 h-4 w-4" />Créer le compte</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG : MODIFIER ═════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o) setFormError(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <span className="flex items-center gap-2 mt-1">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {selectedUser.prenom[0]}{selectedUser.nom[0]}
                  </span>
                  {selectedUser.prenom} {selectedUser.nom} — {selectedUser.email}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <FormError message={formError} />

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required>
                <Input
                  value={editData.prenom}
                  onChange={e => setEditData({ ...editData, prenom: e.target.value })}
                />
              </Field>
              <Field label="Nom" required>
                <Input
                  value={editData.nom}
                  onChange={e => setEditData({ ...editData, nom: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date anniversaire">
                <Input
                  type="date"
                  value={editData.dateAnniversaire}
                  onChange={e => setEditData({ ...editData, dateAnniversaire: e.target.value })}
                />
              </Field>
              <Field label="CIN">
                <Input
                  value={editData.cin}
                  onChange={e => setEditData({ ...editData, cin: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Rôle">
              <Select
                value={editData.role}
                onValueChange={v => setEditData({ ...editData, role: v as 'admin' | 'user' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" /> Utilisateur
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Administrateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</>
                : <><Check className="mr-2 h-4 w-4" />Sauvegarder</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG : VOIR DÉTAIL ══════════════════════════ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Détail utilisateur</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="py-2">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-4 border-primary/20 text-primary text-2xl font-bold mb-3">
                  {selectedUser.prenom[0]}{selectedUser.nom[0]}
                </div>
                <p className="text-lg font-semibold">{selectedUser.prenom} {selectedUser.nom}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <Badge
                  variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}
                  className="mt-2 gap-1"
                >
                  {selectedUser.role === 'admin'
                    ? <><Shield className="h-3 w-3" /> Administrateur</>
                    : <><UserIcon className="h-3 w-3" /> Utilisateur</>
                  }
                </Badge>
              </div>

              {/* Infos */}
              <div className="space-y-1 rounded-lg border divide-y">
                <DetailRow label="ID" value={`#${selectedUser.id}`} />
                <DetailRow label="CIN" value={selectedUser.cin || '—'} />
                <DetailRow label="Date anniversaire" value={selectedUser.dateAnniversaire || '—'} />
                <DetailRow
                  label="Membre depuis"
                  value={new Date(selectedUser.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Fermer
            </Button>
            <Button onClick={() => {
              setViewOpen(false)
              if (selectedUser) openEdit(selectedUser)
            }}>
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ALERTDIALOG : CONFIRMER SUPPRESSION ══════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement le compte de{' '}
              <span className="font-semibold text-foreground">
                {selectedUser?.prenom} {selectedUser?.nom}
              </span>{' '}
              ({selectedUser?.email}). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (password.length < 6) return { label: 'Trop court', color: 'bg-destructive', width: 'w-1/4' }
    if (password.length < 8) return { label: 'Faible', color: 'bg-orange-500', width: 'w-2/4' }
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return { label: 'Fort', color: 'bg-green-500', width: 'w-full' }
    return { label: 'Moyen', color: 'bg-yellow-500', width: 'w-3/4' }
  }
  const s = getStrength()
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 w-full rounded-full bg-muted">
        <div className={`h-1 rounded-full transition-all ${s.color} ${s.width}`} />
      </div>
      <p className="text-xs text-muted-foreground">Force : {s.label}</p>
    </div>
  )
}
