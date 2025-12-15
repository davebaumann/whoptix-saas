import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface User {
  id: string
  email: string
  customerRole: number
  isCurrentUser: boolean
}

interface Invitation {
  id: number
  email: string
  role: number
  createdAt: string
  expiresAt: string
  invitedBy: string
}

const roleNames = {
  1: 'Owner',
  2: 'Admin', 
  3: 'Manager',
  4: 'Viewer'
}

export default function UserManagement() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(4)
  const queryClient = useQueryClient()

  const { data: users } = useQuery<User[]>({
    queryKey: ['customer-users'],
    queryFn: async () => {
      const response = await fetch('/api/usermanagement/users', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    }
  })

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ['pending-invitations'],
    queryFn: async () => {
      const response = await fetch('/api/userinvitation/pending', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch invitations')
      return response.json()
    }
  })

  const inviteUser = useMutation({
    mutationFn: async (data: { email: string, role: number }) => {
      const response = await fetch('/api/userinvitation/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to send invitation')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] })
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole(4)
    }
  })

  const handleInvite = () => {
    inviteUser.mutate({ email: inviteEmail, role: inviteRole })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Invite User
        </button>
      </div>

      {/* Current Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Team Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users?.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.email} {user.isCurrentUser && <span className="text-blue-600">(You)</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {roleNames[user.customerRole as keyof typeof roleNames]}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {!user.isCurrentUser && (
                      <button className="text-red-600 hover:text-red-800">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Pending Invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invitations.map(invitation => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{invitation.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {roleNames[invitation.role as keyof typeof roleNames]}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{invitation.invitedBy}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Invite User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={4}>Viewer</option>
                  <option value={3}>Manager</option>
                  <option value={2}>Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || inviteUser.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {inviteUser.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}