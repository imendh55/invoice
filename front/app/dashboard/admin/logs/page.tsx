'use client'

import { useState } from 'react'
import { Info, AlertTriangle, XCircle, CheckCircle, Download, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockSystemLogs } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { SystemLog } from '@/lib/types'

const logTypeConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500 bg-blue-500/10',
    badge: 'bg-blue-500/10 text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning bg-warning/10',
    badge: 'bg-warning/10 text-warning',
  },
  error: {
    icon: XCircle,
    color: 'text-destructive bg-destructive/10',
    badge: 'bg-destructive/10 text-destructive',
  },
  success: {
    icon: CheckCircle,
    color: 'text-success bg-success/10',
    badge: 'bg-success/10 text-success',
  },
}

export default function LogsAdminPage() {
  const [logs] = useState<SystemLog[]>(mockSystemLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || log.type === typeFilter
    return matchesSearch && matchesType
  })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs système</h1>
          <p className="text-muted-foreground">Consultez les journaux d&apos;activité du système</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exporter Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Filtres</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-10 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={cn('cursor-pointer', typeFilter === 'info' && logTypeConfig.info.badge)}
              onClick={() => setTypeFilter(typeFilter === 'info' ? 'all' : 'info')}
            >
              <Info className="mr-1 h-3 w-3" />
              Info
            </Badge>
            <Badge
              variant="outline"
              className={cn('cursor-pointer', typeFilter === 'warning' && logTypeConfig.warning.badge)}
              onClick={() => setTypeFilter(typeFilter === 'warning' ? 'all' : 'warning')}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Warning
            </Badge>
            <Badge
              variant="outline"
              className={cn('cursor-pointer', typeFilter === 'error' && logTypeConfig.error.badge)}
              onClick={() => setTypeFilter(typeFilter === 'error' ? 'all' : 'error')}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Error
            </Badge>
            <Badge
              variant="outline"
              className={cn('cursor-pointer', typeFilter === 'success' && logTypeConfig.success.badge)}
              onClick={() => setTypeFilter(typeFilter === 'success' ? 'all' : 'success')}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Success
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Logs système - {formatDate(logs[0]?.timestamp || new Date().toISOString())}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun log trouvé
              </div>
            ) : (
              filteredLogs.map((log) => {
                const config = logTypeConfig[log.type]
                const Icon = config.icon
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </span>
                        <Badge className={config.badge}>
                          {log.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm">{log.message}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
