import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { Download } from 'lucide-react'

interface LeadTimeByVendor {
  vendor: string
  totalOrders: number
  completedOrders: number
  averageLeadTimeDays: number
  minLeadTimeDays: number
  maxLeadTimeDays: number
  latePurchaseOrders: number
  latePercentage: number
}

interface LeadTimeByItem {
  sku: string
  partNumber: string
  vendor: string
  totalReceipts: number
  averageLeadTimeDays: number
  minLeadTimeDays: number
  maxLeadTimeDays: number
  totalQuantityReceived: number
  avgQtyPerReceipt: number
}

interface LeadTimeReportSummary {
  totalVendors: number
  totalSkus: number
  totalPurchaseOrders: number
  totalReceipts: number
  overallAverageLeadTimeDays: number
  latePoCount: number
  latePoPercentage: number
}

interface LeadTimeResponse {
  summary: LeadTimeReportSummary
  byVendor: LeadTimeByVendor[]
  byItem: LeadTimeByItem[]
}

export default function LeadTimeReport() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentVendorPage, setCurrentVendorPage] = useState(1)
  const [currentItemPage, setCurrentItemPage] = useState(1)
  const [vendorSort, setVendorSort] = useState<{ field: keyof LeadTimeByVendor; dir: 'asc' | 'desc' }>({ field: 'averageLeadTimeDays', dir: 'desc' })
  const [itemSort, setItemSort] = useState<{ field: keyof LeadTimeByItem; dir: 'asc' | 'desc' }>({ field: 'averageLeadTimeDays', dir: 'desc' })
  const [vendorSearch, setVendorSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const pageSize = 25

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required.</p>
        </div>
      </div>
    )
  }

  const adminViewingData = sessionStorage.getItem('adminViewingAs')
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null
  const customerId = adminViewingCustomerId || user.customerId || 1

  const { data: leadTimeData, isLoading } = useQuery<LeadTimeResponse>({
    queryKey: ['leadTimeReport', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/lead-time`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch lead time report')
      }
      return response.json()
    },
  })

  const handleVendorSort = (field: keyof LeadTimeByVendor) => {
    setVendorSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc'
    }))
    setCurrentVendorPage(1)
  }

  const handleItemSort = (field: keyof LeadTimeByItem) => {
    setItemSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc'
    }))
    setCurrentItemPage(1)
  }

  const getSortedVendors = () => {
    if (!leadTimeData) return []
    
    let filtered = leadTimeData.byVendor
    if (vendorSearch) {
      filtered = filtered.filter(v => v.vendor.toLowerCase().includes(vendorSearch.toLowerCase()))
    }

    return filtered.sort((a, b) => {
      const aVal = a[vendorSort.field]
      const bVal = b[vendorSort.field]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return vendorSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      const numA = Number(aVal)
      const numB = Number(bVal)
      return vendorSort.dir === 'asc' ? numA - numB : numB - numA
    })
  }

  const getSortedItems = () => {
    if (!leadTimeData) return []
    
    let filtered = leadTimeData.byItem
    if (itemSearch) {
      filtered = filtered.filter(i => 
        i.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.partNumber.toLowerCase().includes(itemSearch.toLowerCase())
      )
    }

    return filtered.sort((a, b) => {
      const aVal = a[itemSort.field]
      const bVal = b[itemSort.field]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return itemSort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      const numA = Number(aVal)
      const numB = Number(bVal)
      return itemSort.dir === 'asc' ? numA - numB : numB - numA
    })
  }

  const sortedVendors = getSortedVendors()
  const sortedItems = getSortedItems()
  
  const vendorPageData = sortedVendors.slice((currentVendorPage - 1) * pageSize, currentVendorPage * pageSize)
  const itemPageData = sortedItems.slice((currentItemPage - 1) * pageSize, currentItemPage * pageSize)
  
  const vendorTotalPages = Math.ceil(sortedVendors.length / pageSize)
  const itemTotalPages = Math.ceil(sortedItems.length / pageSize)

  const exportToCSV = (type: 'vendor' | 'item') => {
    if (!leadTimeData) return

    const rows: string[] = []
    
    if (type === 'vendor') {
      rows.push('Vendor,Total Orders,Completed Orders,Avg Lead Time (Days),Min Lead Time,Max Lead Time,Late Orders,Late %')
      sortedVendors.forEach(v => {
        rows.push(`"${v.vendor}",${v.totalOrders},${v.completedOrders},${v.averageLeadTimeDays},${v.minLeadTimeDays},${v.maxLeadTimeDays},${v.latePurchaseOrders},${v.latePercentage}%`)
      })
    } else {
      rows.push('SKU,Part Number,Vendor,Total Receipts,Avg Lead Time (Days),Min Lead Time,Max Lead Time,Total Quantity,Avg Qty/Receipt')
      sortedItems.forEach(i => {
        rows.push(`"${i.sku}","${i.partNumber}","${i.vendor}",${i.totalReceipts},${i.averageLeadTimeDays},${i.minLeadTimeDays},${i.maxLeadTimeDays},${i.totalQuantityReceived},${i.avgQtyPerReceipt}`)
      })
    }

    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `lead-time-${type}-${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading lead time report...</p>
        </div>
      </div>
    )
  }

  if (!leadTimeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load lead time report</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Lead Time Report</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Total Vendors</h3>
          <p className="text-3xl font-bold text-gray-900">{leadTimeData.summary.totalVendors}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Total SKUs</h3>
          <p className="text-3xl font-bold text-gray-900">{leadTimeData.summary.totalSkus}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Avg Lead Time</h3>
          <p className="text-3xl font-bold text-gray-900">{leadTimeData.summary.overallAverageLeadTimeDays.toFixed(1)}</p>
          <p className="text-xs text-gray-500">days</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Late Orders</h3>
          <p className="text-3xl font-bold text-gray-900">{leadTimeData.summary.latePoPercentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">{leadTimeData.summary.latePoCount} of {leadTimeData.summary.totalPurchaseOrders}</p>
        </div>
      </div>

      {/* Lead Time by Vendor Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lead Time by Vendor</h2>
          <button
            onClick={() => exportToCSV('vendor')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download size={16} />
            Export
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search vendors..."
            value={vendorSearch}
            onChange={(e) => {
              setVendorSearch(e.target.value)
              setCurrentVendorPage(1)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {(['vendor', 'totalOrders', 'completedOrders', 'averageLeadTimeDays', 'minLeadTimeDays', 'maxLeadTimeDays', 'latePurchaseOrders', 'latePercentage'] as const).map(field => (
                  <th
                    key={field}
                    onClick={() => handleVendorSort(field)}
                    className="px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      {field === 'vendor' ? 'Vendor' :
                       field === 'totalOrders' ? 'Total Orders' :
                       field === 'completedOrders' ? 'Completed' :
                       field === 'averageLeadTimeDays' ? 'Avg Days' :
                       field === 'minLeadTimeDays' ? 'Min Days' :
                       field === 'maxLeadTimeDays' ? 'Max Days' :
                       field === 'latePurchaseOrders' ? 'Late Orders' : 'Late %'}
                      {vendorSort.field === field && (
                        <span>{vendorSort.dir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendorPageData.map((vendor, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.vendor}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.totalOrders}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.completedOrders}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.averageLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.minLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.maxLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.latePurchaseOrders}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{vendor.latePercentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing {vendorPageData.length > 0 ? (currentVendorPage - 1) * pageSize + 1 : 0} to {Math.min(currentVendorPage * pageSize, sortedVendors.length)} of {sortedVendors.length}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentVendorPage(Math.max(1, currentVendorPage - 1))}
              disabled={currentVendorPage === 1}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">{currentVendorPage} / {vendorTotalPages}</span>
            <button
              onClick={() => setCurrentVendorPage(Math.min(vendorTotalPages, currentVendorPage + 1))}
              disabled={currentVendorPage === vendorTotalPages}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Lead Time by Item Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lead Time by Item</h2>
          <button
            onClick={() => exportToCSV('item')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by SKU or Part Number..."
            value={itemSearch}
            onChange={(e) => {
              setItemSearch(e.target.value)
              setCurrentItemPage(1)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {(['sku', 'partNumber', 'vendor', 'totalReceipts', 'averageLeadTimeDays', 'minLeadTimeDays', 'maxLeadTimeDays', 'totalQuantityReceived', 'avgQtyPerReceipt'] as const).map(field => (
                  <th
                    key={field}
                    onClick={() => handleItemSort(field)}
                    className="px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      {field === 'sku' ? 'SKU' :
                       field === 'partNumber' ? 'Part #' :
                       field === 'vendor' ? 'Vendor' :
                       field === 'totalReceipts' ? 'Receipts' :
                       field === 'averageLeadTimeDays' ? 'Avg Days' :
                       field === 'minLeadTimeDays' ? 'Min Days' :
                       field === 'maxLeadTimeDays' ? 'Max Days' :
                       field === 'totalQuantityReceived' ? 'Total Qty' : 'Avg Qty'}
                      {itemSort.field === field && (
                        <span>{itemSort.dir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemPageData.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{item.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.partNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.vendor}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.totalReceipts}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.averageLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.minLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.maxLeadTimeDays.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.totalQuantityReceived}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.avgQtyPerReceipt.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">Showing {itemPageData.length > 0 ? (currentItemPage - 1) * pageSize + 1 : 0} to {Math.min(currentItemPage * pageSize, sortedItems.length)} of {sortedItems.length}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentItemPage(Math.max(1, currentItemPage - 1))}
              disabled={currentItemPage === 1}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">{currentItemPage} / {itemTotalPages}</span>
            <button
              onClick={() => setCurrentItemPage(Math.min(itemTotalPages, currentItemPage + 1))}
              disabled={currentItemPage === itemTotalPages}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
