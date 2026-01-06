import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, UserPlus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5239';

interface User {
  id: string;
  email: string;
  userName: string;
  emailConfirmed: boolean;
  lockoutEnd: string | null;
  roles: string[];
  customerId: number | null;
  isInvitation?: boolean;
}

interface CustomerUser {
  id: string;
  userId: string;
  userEmail: string;
  customerRole: string;
  dateAdded: string;
}

interface UsersResponse {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const fetchUsers = async (page: number = 1, pageSize: number = 10, isSystemAdmin: boolean = false): Promise<UsersResponse> => {
  const endpoint = isSystemAdmin 
    ? `/api/admin/users?page=${page}&pageSize=${pageSize}`
    : `/api/userinvitation/pending`; // Account admins see pending invitations
    
  const response = await fetch(endpoint, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  if (isSystemAdmin) {
    return response.json();
  } else {
    // Transform invitation data to match UsersResponse format
    const invitations = await response.json();
    return {
      users: invitations.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        userName: inv.email,
        emailConfirmed: false,
        lockoutEnd: null,
        roles: [inv.role],
        customerId: null,
        isInvitation: true
      })),
      totalCount: invitations.length,
      page: 1,
      pageSize: invitations.length,
      totalPages: 1
    };
  }
};

const fetchCustomerUsers = async (): Promise<CustomerUser[]> => {
  const response = await fetch(`${API_BASE_URL}/api/userinvitation/customer-users`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer users');
  }

  return response.json();
};

const updateCustomerUser = async (userId: string, userData: { email?: string; customerRole?: string }) => {
  const response = await fetch(`/api/userinvitation/customer-users/${userId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
};

const deleteCustomerUser = async (userId: string) => {
  const response = await fetch(`/api/userinvitation/customer-users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
};

const createUser = async (userData: { email: string; role: string }) => {
  const endpoint = '/api/userinvitation/invite';
  // Map 'email' to 'Email' and 'role' to 'Role', wrap in request object
  const mappedUserData = { Email: userData.email, Role: userData.role };
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request: mappedUserData }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
};

const updateUser = async (id: string, userData: { email: string; role: string; customerId?: number }) => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
};

const deleteUser = async (id: string, isInvitation: boolean = false) => {
  const endpoint = isInvitation 
    ? `/api/userinvitation/${id}` 
    : `/api/admin/users/${id}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserDeleteModal, setShowUserDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCustomerUser, setSelectedCustomerUser] = useState<CustomerUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const pageSize = 10;

  const queryClient = useQueryClient();

  // Check if user has admin permissions (System Admin or Account Admin)
  if (!currentUser?.isSystemAdmin && !currentUser?.isAccountAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">Access Restricted</h2>
            <p className="text-yellow-800 mb-4">
              You do not have administrator permissions to access user management.
            </p>
            <p className="text-sm text-yellow-700">
              This feature is only available to account administrators who can invite users to their team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['adminUsers', currentPage, currentUser?.isSystemAdmin],
    queryFn: () => fetchUsers(currentPage, pageSize, currentUser?.isSystemAdmin || false),
    retry: (failureCount, error) => {
      // Don't retry on 403 errors
      if (error instanceof Error && error.message.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Query to fetch users connected to the current customer (for account admins)
  const { data: customerUsers = [], isLoading: customerUsersLoading } = useQuery({
    queryKey: ['customerUsers'],
    queryFn: fetchCustomerUsers,
    enabled: !currentUser?.isSystemAdmin, // Only for account admins
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; email: string; role: string; customerId?: number }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowEditModal(false);
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, isInvitation }: { id: string; isInvitation: boolean }) => deleteUser(id, isInvitation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowDeleteModal(false);
      setSelectedUser(null);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, ...data }: { userId: string; customerRole: string }) =>
      updateCustomerUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerUsers'] });
      setShowEditModal(false);
      setSelectedCustomerUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteCustomerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerUsers'] });
      setShowUserDeleteModal(false);
      setSelectedCustomerUser(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    // Check if it's a 403 error (insufficient permissions)
    const errorMessage = String(error);
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return (
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-yellow-900 mb-2">Access Denied</h2>
              <p className="text-yellow-800 mb-4">
                {currentUser?.isSystemAdmin 
                  ? "You don't have sufficient permissions to access user management."
                  : "You don't have sufficient permissions to access team management."}
              </p>
              <p className="text-sm text-yellow-700">
                {currentUser?.isSystemAdmin
                  ? "Please contact your system administrator to request admin access."
                  : "Please contact your account administrator to request team management access."}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    // Other errors
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">Error loading users: {errorMessage}</div>
        </div>
      </div>
    );
  }

  const totalPages = usersData?.totalPages || 1;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {currentUser?.isSystemAdmin ? 'User Management' : 'Team Management'}
            </h1>
          </div>
          <p className="text-gray-600">
            {currentUser?.isSystemAdmin 
              ? 'Manage AspNetUser accounts and roles' 
              : 'Invite and manage users in your account'}
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {currentUser?.isSystemAdmin 
              ? `Total users: ${usersData?.totalCount || 0}`
              : `Pending invitations: ${usersData?.totalCount || 0}`}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {currentUser?.isSystemAdmin ? 'Add User' : 'Invite User'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usersData?.users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role === 'Admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.customerId || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.lockoutEnd
                          ? 'bg-red-100 text-red-800'
                          : user.emailConfirmed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {user.lockoutEnd ? 'Locked' : user.emailConfirmed ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, usersData?.totalCount || 0)} of {usersData?.totalCount || 0} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Customer Users Section (for account admins) */}
        {!currentUser?.isSystemAdmin && (
          <div className="mt-8">
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
              </div>
              <p className="text-gray-600">Users connected to your account</p>
            </div>

            {customerUsersLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-500">Loading team members...</div>
              </div>
            ) : customerUsers && customerUsers.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerUsers.map((user) => (
                      <tr key={user.userId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.customerRole === 'Owner'
                              ? 'bg-purple-100 text-purple-800'
                              : user.customerRole === 'Admin'
                              ? 'bg-red-100 text-red-800'
                              : user.customerRole === 'Manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.customerRole}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.dateAdded).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="space-x-2">
                            <button
                              onClick={() => {
                                setSelectedCustomerUser(user);
                                setEditRole(user.customerRole);
                                setShowEditModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomerUser(user);
                                setShowUserDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No team members yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">{currentUser?.isSystemAdmin ? 'Create New User' : 'Invite User'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  email: formData.get('email') as string,
                  role: formData.get('role') as string,
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Viewer">User</option>
                    <option value="Owner">Account Admin</option>
                  </select>
                </div>
                {!currentUser?.isSystemAdmin && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      An invitation email will be sent to the user. They will create their own password when accepting the invitation.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {createMutation.isPending ? (currentUser?.isSystemAdmin ? 'Creating...' : 'Sending Invitation...') : (currentUser?.isSystemAdmin ? 'Create User' : 'Send Invitation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Edit User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: selectedUser.id,
                  email: formData.get('email') as string,
                  role: formData.get('role') as string,
                  customerId: formData.get('customerId') ? Number(formData.get('customerId')) : undefined,
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={selectedUser.email}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    name="role"
                    defaultValue={selectedUser.roles[0] || 'CustomerUser'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="CustomerUser">Customer User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                  <input
                    type="number"
                    name="customerId"
                    defaultValue={selectedUser.customerId || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal - System Admin or Pending Invitations */}
      {showDeleteModal && selectedUser && (currentUser?.isSystemAdmin || (selectedUser.isInvitation && currentUser?.isAccountAdmin)) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">{selectedUser.isInvitation ? 'Cancel Invitation' : 'Delete User'}</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {selectedUser.isInvitation ? 'cancel the invitation for' : 'delete'} <strong>{selectedUser.email}</strong>? {selectedUser.isInvitation ? 'They will no longer receive the invitation.' : 'This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: selectedUser.id, isInvitation: selectedUser.isInvitation || false })}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : (selectedUser.isInvitation ? 'Cancel Invitation' : 'Delete User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer User Modal */}
      {showUserDeleteModal && selectedCustomerUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Remove Team Member</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove <strong>{selectedCustomerUser.userEmail}</strong> from your account? They will no longer have access to your organization.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setShowUserDeleteModal(false); setSelectedCustomerUser(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUserMutation.mutate(selectedCustomerUser.userId)}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer User Role Modal */}
      {showEditModal && selectedCustomerUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Change Role</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserMutation.mutate({
                  userId: selectedCustomerUser.userId,
                  customerRole: editRole,
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Email</label>
                  <input
                    type="email"
                    disabled
                    value={selectedCustomerUser.userEmail}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedCustomerUser(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {updateUserMutation.isPending ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}