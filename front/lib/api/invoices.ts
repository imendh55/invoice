// lib/api/invoices.ts
import { API_BASE_URL, getHeaders, getUploadHeaders, handleApiResponse } from './config'

// Types
export interface InvoiceProduct {
  id?: number
  nom: string
  quantite: number
  prixUnitaire: number
  total: number
}

export interface ExtractedData {
  numeroFacture: string
  date: string
  fournisseur: string
  adresseFournisseur?: string
  client?: string
  adresseClient?: string
  totalHT: number
  tva: number
  totalTTC: number
  produits: InvoiceProduct[]
}

export interface Invoice {
  id: number
  fileName: string
  filePath: string
  fileSize?: number
  status: 'en_cours' | 'en_attente' | 'validee' | 'rejetee' | 'erreur'
  confidenceScore?: number
  extractedData?: ExtractedData
  createdAt: string
  updatedAt?: string
  userId: number
}

export interface UploadResponse {
  id: number
  fileName: string
  status: string
  message: string
}

export interface ValidationRequest {
  corrections?: Partial<ExtractedData>
  approved: boolean
  rejectionReason?: string
}

export interface SearchParams {
  query?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ====================== API CALLS ======================

// Upload une facture
export async function uploadInvoice(file: File, token: string): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/invoices/upload`, {
    method: 'POST',
    headers: getUploadHeaders(token),
    body: formData,
  })

  return handleApiResponse<UploadResponse>(response)
}

// Historique des factures
export async function getHistory(token: string, params?: SearchParams): Promise<PaginatedResponse<Invoice>> {
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value))
      }
    })
  }

  const url = `${API_BASE_URL}/invoices/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  })

  return handleApiResponse<PaginatedResponse<Invoice>>(response)
}

// Statistiques du dashboard
export async function getDashboardStats(token: string) {
  const response = await fetch(`${API_BASE_URL}/invoices/stats`, {
    method: 'GET',
    headers: getHeaders(token),
  })

  return handleApiResponse(response)
}

// Détail d'une facture
export async function getInvoice(id: number, token: string): Promise<Invoice> {
  const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
  })

  return handleApiResponse<Invoice>(response)
}

// Valider / Rejeter une facture
export async function validateInvoice(id: number, token: string, data: ValidationRequest): Promise<Invoice> {
  const response = await fetch(`${API_BASE_URL}/invoices/${id}/validate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })

  return handleApiResponse<Invoice>(response)
}

// Supprimer une facture
export async function deleteInvoice(id: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  })

  if (!response.ok) throw new Error('Erreur lors de la suppression')
}

// Exporter des factures
export async function exportInvoices(token: string, params: any): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/invoices/export`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(params),
  })

  if (!response.ok) throw new Error('Erreur lors de l\'export')
  return response.blob()
}