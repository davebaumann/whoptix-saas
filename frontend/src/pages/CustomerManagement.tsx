import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, AdminCustomerResponse, AdminCustomerCreate, AdminCustomerUpdate } from '../api/client'
import { membershipService } from '../api/membershipService'
import { Crown, Shield, Star, Zap, Eye, User, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showMembershipModal, setShowMembershipModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerResponse | null>(null)
  const [selectedMembershipLevel, setSelectedMembershipLevel] = useState<number>(1)
  const [membershipReason, setMembershipReason] = useState('')
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false)
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const pageSize = 10

  const queryClient = useQueryClient()

  // Queries
  const { data: customersData, isLoading, error } = useQuery({
    queryKey: ['adminCustomers', currentPage, searchTerm],
    queryFn: () => apiClient.getAdminCustomers(currentPage, pageSize, searchTerm || undefined),
  })

  // Get customers with membership info
  const { data: membershipCustomers } = useQuery({
    queryKey: ['customersMembership'],
    queryFn: () => membershipService.getAllCustomersWithMembership(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (customer: AdminCustomerCreate) => apiClient.createAdminCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (customer: AdminCustomerUpdate) => apiClient.updateAdminCustomer(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      setShowEditModal(false)
      setSelectedCustomer(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (customerId: number) => apiClient.deleteAdminCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      setShowDeleteModal(false)
      setSelectedCustomer(null)
    },
  })

  const membershipMutation = useMutation({
    mutationFn: ({ customerId, newLevel, reason }: { customerId: number; newLevel: number; reason?: string }) => 
      membershipService.updateMembership(customerId, newLevel, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      queryClient.invalidateQueries({ queryKey: ['customersMembership'] })
      setShowMembershipModal(false)
      setSelectedCustomer(null)
      setMembershipReason('')
    },
    onError: (error) => {
      console.error('Failed to update membership:', error)
      alert(`Failed to update membership: ${error.message}`)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (customerId: number) => {
      const token = localStorage.getItem('token')
      return fetch(`/api/admin/customers/${customerId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      setShowCancelModal(false)
      setSelectedCustomer(null)
    },
  })

  const syncMutation = useMutation({
    mutationFn: (customerId: number) => {
      const token = localStorage.getItem('token')
      return fetch(`/api/admin/customers/${customerId}/trigger-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => {
        if (!res.ok) throw new Error('Failed to trigger sync')
        return res.json()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      alert('Initial sync triggered successfully!')
    },
    onError: (error: Error) => {
      alert(`Failed to trigger sync: ${error.message}`)
    },
  })

  const refreshTokensMutation = useMutation({
    mutationFn: (customerId: number) => {
      const token = localStorage.getItem('token')
      return fetch(`/api/customers/refresh-skuvault-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to refresh tokens')
        return res.json()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })
      alert('SkuVault tokens refreshed successfully!')
    },
    onError: (error: Error) => {
      alert(`Failed to refresh tokens: ${error.message}`)
    },
  })

  const handleMembershipEdit = (customer: AdminCustomerResponse) => {
    setSelectedCustomer(customer)
    const membershipCustomer = membershipCustomers?.find(mc => mc.id === customer.id)
    setSelectedMembershipLevel(membershipCustomer?.membershipLevel || 1)
    setMembershipReason('')
    setShowMembershipModal(true)
  }

  const handleViewAsCustomer = async (customer: AdminCustomerResponse) => {
    try {
      // Get membership level from membershipCustomers query
      const membershipCustomer = membershipCustomers?.find(mc => mc.id === customer.id)
      
      // Store admin impersonation context in sessionStorage
      sessionStorage.setItem('adminViewingAs', JSON.stringify({
        adminId: 'current-admin-id',
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        membershipLevel: membershipCustomer?.membershipLevel || 1,
        tenantId: customer.tenantId,
        timestamp: new Date().toISOString()
      }))
      
      // Navigate to customer dashboard
      window.location.href = '/app/dashboard'
    } catch (error) {
      alert(`Failed to impersonate customer: ${error}`)
    }
  }

  const handleCustomerDetails = async (customer: AdminCustomerResponse) => {
    try {
      // Fetch detailed customer information
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/customer/${customer.id}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const details = await response.json()
        setCustomerDetails({
          ...customer,
          ...details,
          lastActivity: new Date().toISOString() // Mock data
        })
        setSelectedCustomer(customer)
        setShowCustomerDetailsModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch customer details:', error)
      alert('Failed to load customer details')
    }
  }

  const getMembershipIcon = (level: number) => {
    switch (level) {
      case 1: return <Shield className="w-4 h-4 text-gray-500" />
      case 2: return <Star className="w-4 h-4 text-blue-500" />
      case 3: return <Crown className="w-4 h-4 text-yellow-500" />
      case 4: return <Zap className="w-4 h-4 text-purple-500" />
      default: return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getMembershipBadgeColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-gray-100 text-gray-800'
      case 2: return 'bg-blue-100 text-blue-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      case 4: return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPages = Math.ceil((customersData?.totalCount || 0) / pageSize)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">Error loading customers: {String(error)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage customer accounts and their settings</p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Customer
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Synced
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Support Tools
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customersData?.customers?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                customersData?.customers?.map((customer) => {
                  const membershipCustomer = membershipCustomers?.find(mc => mc.id === customer.id)
                  const membershipLevel = membershipCustomer?.membershipLevel || 1
                  const membershipName = membershipCustomer?.membershipLevelName || 'Basic'
                  
                  return (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getMembershipIcon(membershipLevel)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMembershipBadgeColor(membershipLevel)}`}>
                            {membershipName}
                          </span>
                          <button
                            onClick={() => handleMembershipEdit(customer)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Change
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{customer.tenantName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.lastSyncedAt ? new Date(customer.lastSyncedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => syncMutation.mutate(customer.id)}
                            disabled={syncMutation.isPending}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50"
                            title="Reset sync to trigger initial sync"
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
                          </button>
                          <button
                            onClick={() => refreshTokensMutation.mutate(customer.id)}
                            disabled={refreshTokensMutation.isPending}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded hover:bg-orange-100 disabled:opacity-50"
                            title="Refresh SkuVault tokens using saved credentials"
                          >
                            {refreshTokensMutation.isPending ? 'Refreshing...' : 'Refresh Tokens'}
                          </button>
                          <button
                            onClick={() => handleViewAsCustomer(customer)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                            title="View application as this customer"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View As
                          </button>
                          <button
                            onClick={() => handleCustomerDetails(customer)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
                            title="View customer details and activity"
                          >
                            <User className="w-3 h-3 mr-1" />
                            Details
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowEditModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowCancelModal(true)
                            }}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowDeleteModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, customersData?.totalCount || 0)} of {customersData?.totalCount || 0} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Add New Customer</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                createMutation.mutate({
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  tenantName: formData.get('tenantName') as string,
                  skuVaultTenantToken: formData.get('skuVaultTenantToken') as string,
                  skuVaultUserToken: formData.get('skuVaultUserToken') as string,
                })
              }}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" name="name" id="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" id="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">Tenant Name</label>
                  <input type="text" name="tenantName" id="tenantName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="skuVaultTenantToken" className="block text-sm font-medium text-gray-700">SkuVault Tenant Token</label>
                  <input type="text" name="skuVaultTenantToken" id="skuVaultTenantToken" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="skuVaultUserToken" className="block text-sm font-medium text-gray-700">SkuVault User Token</label>
                  <input type="text" name="skuVaultUserToken" id="skuVaultUserToken" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{createMutation.isPending ? 'Creating...' : 'Create Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Edit Customer</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                updateMutation.mutate({
                  id: selectedCustomer.id,
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  tenantName: formData.get('tenantName') as string,
                  skuVaultTenantToken: '', // Keep existing token (handled by backend)
                  skuVaultUserToken: '', // Keep existing token (handled by backend)
                })
              }}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" name="name" id="edit-name" defaultValue={selectedCustomer.name} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" id="edit-email" defaultValue={selectedCustomer.email} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="edit-tenantName" className="block text-sm font-medium text-gray-700">Tenant Name</label>
                  <input type="text" name="tenantName" id="edit-tenantName" defaultValue={selectedCustomer.tenantName} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> SkuVault tokens are not displayed for security reasons. Contact system administrator to update integration credentials.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedCustomer(null) }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{updateMutation.isPending ? 'Updating...' : 'Update Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Delete Customer</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{selectedCustomer.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => { setShowDeleteModal(false); setSelectedCustomer(null) }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
              <button onClick={() => deleteMutation.mutate(selectedCustomer.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50">{deleteMutation.isPending ? 'Deleting...' : 'Delete Customer'}</button>
            </div>
          </div>
        </div>
      )}

      {showMembershipModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Update Membership Level</h2>
              <button onClick={() => setShowMembershipModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-4">Update membership level for <strong>{selectedCustomer.name}</strong></p>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Membership Level</label>
                <select value={selectedMembershipLevel} onChange={(e) => setSelectedMembershipLevel(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={1}>Basic - Essential inventory tracking</option>
                  <option value={2}>Standard - Basic + Low Stock Alerts</option>
                  <option value={3}>Premium - Standard + Advanced Analytics</option>
                  <option value={4}>Enterprise - All features</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for change (optional)</label>
                <textarea value={membershipReason} onChange={(e) => setMembershipReason(e.target.value)} placeholder="e.g., Customer upgrade request, promotional offer..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowMembershipModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
              <button
                onClick={() => {
                  membershipMutation.mutate({
                    customerId: selectedCustomer.id,
                    newLevel: selectedMembershipLevel,
                    reason: membershipReason || undefined
                  })
                }}
                disabled={membershipMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {membershipMutation.isPending ? 'Updating...' : 'Update Membership'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerDetailsModal && selectedCustomer && customerDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Customer Support Details</h2>
              <button 
                onClick={() => setShowCustomerDetailsModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tenant</label>
                    <p className="text-sm text-gray-900">{selectedCustomer.tenantName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Synced</label>
                    <p className="text-sm text-gray-900">
                      {selectedCustomer.lastSyncedAt ? new Date(selectedCustomer.lastSyncedAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Membership & Access</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Level</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getMembershipIcon(customerDetails.currentLevel || 1)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMembershipBadgeColor(customerDetails.currentLevel || 1)}`}>
                        {customerDetails.currentLevelName || 'Basic'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Available Reports</label>
                    <p className="text-sm text-gray-900">{customerDetails.availableReports?.length || 0} reports</p>
                  </div>
                </div>
                
                {customerDetails.availableReports && customerDetails.availableReports.length > 0 && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-500">Accessible Reports</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {customerDetails.availableReports.map((report: string, index: number) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          {report}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Support Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleViewAsCustomer(selectedCustomer)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View as Customer
                  </button>
                  <button
                    onClick={() => handleMembershipEdit(selectedCustomer)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Change Membership
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomerDetailsModal(false)
                      setShowEditModal(true)
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-100 rounded hover:bg-green-200"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Edit Customer
                  </button>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-4 h-4" />
                    <span>Last login: {customerDetails.lastActivity ? new Date(customerDetails.lastActivity).toLocaleString() : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Data sync status: {selectedCustomer.lastSyncedAt ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Cancel Customer Membership</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel the membership for <strong>{selectedCustomer.name}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Customer data will be automatically purged after 90 days of inactivity.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => { setShowCancelModal(false); setSelectedCustomer(null) }} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button 
                onClick={() => cancelMutation.mutate(selectedCustomer.id)} 
                disabled={cancelMutation.isPending} 
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Membership'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}