import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  getSystemLogs, 
  getLogStats, 
  exportLogsToCSV, 
  downloadCSV,
  type SystemLog,
  type LogLevel,
  type LogCategory 
} from '@/lib/logging-service'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'

export default function AdminLogs() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all')
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)

  // Fetch logs
  const { data: logs = [], isLoading, refetch } = useQuery<SystemLog[]>({
    queryKey: ['system-logs', levelFilter, categoryFilter, searchTerm],
    queryFn: async () => {
      const filters: any = {}
      if (levelFilter !== 'all') filters.level = levelFilter
      if (categoryFilter !== 'all') filters.category = categoryFilter
      if (searchTerm) filters.search = searchTerm
      return await getSystemLogs(filters)
    },
    refetchInterval: 10000 // Refresh every 10s
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['log-stats'],
    queryFn: getLogStats,
    refetchInterval: 30000
  })

  const handleExport = () => {
    const csv = exportLogsToCSV(logs)
    downloadCSV(csv, `logs-${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: '✅ Export réussi',
      description: `${logs.length} logs exportés`
    })
  }

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'info': return <Info className="w-4 h-4 text-blue-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getLevelBadge = (level: LogLevel) => {
    const config = {
      success: 'bg-green-100 text-green-800',
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    return config[level]
  }

  const getCategoryBadge = (category: LogCategory) => {
    const config = {
      api: 'bg-purple-100 text-purple-800',
      payment: 'bg-green-100 text-green-800',
      user: 'bg-blue-100 text-blue-800',
      sync: 'bg-orange-100 text-orange-800',
      system: 'bg-gray-100 text-gray-800',
      sms: 'bg-pink-100 text-pink-800',
      rent: 'bg-indigo-100 text-indigo-800'
    }
    return config[category] || config.system
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-gray-500">Monitor system activity and errors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Logs</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.totalLogs || 0}</h3>
              </div>
              <Info className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Errors</p>
                <h3 className="text-2xl font-bold mt-1 text-red-600">{stats?.errorCount || 0}</h3>
              </div>
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <h3 className="text-2xl font-bold mt-1 text-yellow-600">{stats?.warningCount || 0}</h3>
              </div>
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.todayLogs || 0}</h3>
              </div>
              <Calendar className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher dans les logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Tous les niveaux</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Toutes catégories</option>
              <option value="api">API</option>
              <option value="payment">Paiement</option>
              <option value="user">Utilisateur</option>
              <option value="sync">Sync</option>
              <option value="system">Système</option>
              <option value="sms">SMS</option>
              <option value="rent">Location</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        {isLoading ? (
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Chargement des logs...</p>
          </CardContent>
        ) : logs.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Aucun log trouvé</h3>
            <p className="text-gray-500">Essayez de modifier les filtres</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <Badge className={getLevelBadge(log.level)}>
                          {log.level}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getCategoryBadge(log.category)}>
                        {log.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium line-clamp-2">
                        {log.message}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Log Details</h3>
                <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID</label>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-500">Level</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getLevelIcon(selectedLog.level)}
                      <Badge className={getLevelBadge(selectedLog.level)}>
                        {selectedLog.level}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <div className="mt-1">
                      <Badge className={getCategoryBadge(selectedLog.category)}>
                        {selectedLog.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="mt-1">{selectedLog.message}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>

                {selectedLog.user_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">User ID</label>
                    <p className="font-mono text-sm mt-1">{selectedLog.user_id}</p>
                  </div>
                )}

                {Object.keys(selectedLog.metadata || {}).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Metadata</label>
                    <pre className="mt-1 p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
