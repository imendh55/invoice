// lib/api/config.ts

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:8000/api'

export const getHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const getUploadHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Classe d'erreur enrichie avec le message du backend
export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

// Messages d'erreur HTTP traduits en français
function getHttpErrorMessage(status: number, backendDetail?: string): string {
  // Priorité au message du backend s'il est explicite
  if (backendDetail && backendDetail.length > 0 && backendDetail !== 'Internal Server Error') {
    return backendDetail
  }

  switch (status) {
    case 400:
      return 'Données invalides. Vérifiez les informations saisies.'
    case 401:
      return 'Session expirée ou accès non autorisé. Veuillez vous reconnecter.'
    case 403:
      return "Vous n'avez pas les droits pour effectuer cette action."
    case 404:
      return 'Ressource introuvable.'
    case 409:
      return 'Un conflit a été détecté. Cette ressource existe peut-être déjà.'
    case 422:
      return 'Données mal formatées. Vérifiez les champs obligatoires.'
    case 429:
      return 'Trop de requêtes. Veuillez patienter quelques instants.'
    case 500:
      return 'Erreur interne du serveur. Réessayez plus tard.'
    case 503:
      return 'Service temporairement indisponible. Réessayez plus tard.'
    default:
      return `Erreur inattendue (${status}). Réessayez plus tard.`
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    // 204 No Content — pas de corps JSON
    if (response.status === 204) {
      return undefined as T
    }
    return response.json()
  }

  // Essayer de lire le message d'erreur du backend
  let backendDetail = ''
  try {
    const errorData = await response.json()
    // FastAPI retourne { detail: "..." } ou { detail: [{ msg: "..." }] }
    if (typeof errorData.detail === 'string') {
      backendDetail = errorData.detail
    } else if (Array.isArray(errorData.detail)) {
      // Erreurs de validation Pydantic
      backendDetail = errorData.detail
        .map((e: { msg: string; loc?: string[] }) => {
          const field = e.loc?.slice(-1)[0] || ''
          return field ? `${field}: ${e.msg}` : e.msg
        })
        .join(' | ')
    }
  } catch {
    // Réponse sans corps JSON
  }

  const message = getHttpErrorMessage(response.status, backendDetail)
  throw new ApiError(response.status, message)
}
