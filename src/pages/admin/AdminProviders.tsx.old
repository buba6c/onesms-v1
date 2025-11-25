// @ts-nocheck
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Activity, DollarSign, Plus, Settings, Power, Zap, Trash2 } from 'lucide-react'

export default function AdminProviders() {
  const [providers] = useState([
    {
      id: 1,
      name: '5sim Global',
      code: '5SIM',
      status: 'active',
      priority: 1,
      rating: '96/96',
      countries: 180,
      successRate: 100,
      usageToday: 0,
      usageMax: 10000,
      cost: 0.0000,
      markup: 300
    }
  ])

  const stats = [
    { label: 'Active Providers', value: 1, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Avg Success Rate', value: '100.0%', icon: Activity, color: 'text-blue-500' },
    { label: 'Total SMS Today', value: 0, icon: Activity, color: 'text-purple-500' },
    { label: 'Countries Covered', value: 0, icon: AlertCircle, color: 'text-orange-500' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Providers Management</h1>
          <p className="text-gray-500">SMS & Payment providers configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add 5sim (180+ countries)
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Other Provider
          </Button>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Balance check désactivé (nécessite backend)
        </p>
      </div>

      {/* SMS Providers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">SMS Providers</h2>
          <p className="text-sm text-gray-500">1 active / 1 total</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  </div>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Providers Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Countries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Today</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/SMS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(provider => (
                  <tr key={provider.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-xs text-gray-500">{provider.code}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs">⭐ Rating:</span>
                            <span className="text-xs font-medium text-green-600">{provider.rating}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <Badge variant="success">active</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-blue-600">#1</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-4 bg-green-500 rounded"></div>
                        <span className="font-medium">100%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm">{provider.usageToday} / {provider.usageMax.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{((provider.usageToday / provider.usageMax) * 100).toFixed(1)}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">${provider.cost.toFixed(4)}</div>
                        <div className="text-xs text-green-600">+{provider.markup}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <Settings className="w-4 h-4 text-blue-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <Power className="w-4 h-4 text-red-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <Zap className="w-4 h-4 text-purple-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tips */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📱 SMS Provider Tips</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li><strong>• Priority:</strong> Lower number = higher priority. Provider #1 is used first.</li>
              <li><strong>• Markup:</strong> Add % to provider cost to set your selling price.</li>
              <li><strong>• Health Check:</strong> Test provider API connection and performance.</li>
              <li><strong>• Daily Limits:</strong> Prevent overspending by setting max SMS per day.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Payment Providers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Payment Providers</h2>
            <p className="text-sm text-gray-500">3 active / 3 total</p>
          </div>
          <Button className="bg-green-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Provider
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Active Payment Providers</p>
              <h3 className="text-2xl font-bold mt-1">3</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Avg Fees</p>
              <h3 className="text-2xl font-bold mt-1">-</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Currencies</p>
              <h3 className="text-2xl font-bold mt-1">-</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500">Payment Methods</p>
              <h3 className="text-2xl font-bold mt-1">-</h3>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
