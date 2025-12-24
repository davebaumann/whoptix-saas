const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface Transaction {
  id: number;
  sku: string;
  quantityChange: number;
  reason: string | null;
  reference: string | null;
  performedBy: string | null;
  transactionType: string | null;
  context: string | null;
  occurredAtUtc: string;
  product?: {
    sku: string;
    description: string;
  };
  location?: {
    code: string;
    name: string;
  };
}

export interface TransactionSummaryItem {
  user: string;
  transactionType: string;
  count: number;
  totalQuantity: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TransactionSummaryResponse {
  summary: TransactionSummaryItem[]
}

export interface PickerPerformanceItem {
  date: string;
  picker: string;
  count: number;
  transactionTypes: string[];
}

export interface PickerPerformanceResponse {
  performance: PickerPerformanceItem[];
}

export interface PerformanceMetrics {
  averageItemsPerHour: number
  totalHours: number
  totalItems: number
}

export interface PickerPerformance {
  pickerName: string
  totalTransactions: number
  pickCount: number
  removeCount: number
  addCount: number
  createCount: number
  totalQuantity: number
  pickQuantity: number
  hoursWorked: number
  firstTransaction: string
  lastTransaction: string
  pickRate: number
  transactionRate: number
}

export interface PickerPerformanceResponse {
  period: string
  fromDate: string
  pickers: PickerPerformance[]
}

export interface DailyCount {
  date: string
  totalTransactions: number
  totalQuantity: number
  pickTransactions: number
  packTransactions: number
  receiveTransactions: number
  otherTransactions: number
}

export interface DailyCountsResponse {
  dailyCounts: DailyCount[]
}

// Channel Performance Interfaces
export interface ChannelRevenue {
  channel: string
  revenue: number
  orders: number
  items: number
}

export interface ChannelRevenueResponse {
  revenue: ChannelRevenue[]
}

export interface TopSku {
  sku: string
  quantity: number
  revenue: number
  orders: number
}

export interface TopSkuByChannel {
  channel: string
  topSkus: TopSku[]
}

export interface TopSkuResponse {
  topSkus: TopSkuByChannel[]
}

export interface ChannelTrendPoint {
  date: string
  channel: string
  revenue: number
  orders: number
  items: number
}

export interface ChannelTrendResponse {
  trends: ChannelTrendPoint[]
}

export interface DashboardKPIs {
  totalTransactions: number
  totalQuantity: number
  activeUsers: number
  avgItemsPerHour: number
}

export interface ActivitySummaryItem {
  user: string
  transactionType: string
  count: number
  totalQuantity: number
}

export interface RecentTransaction {
  id: number
  sku: string
  transactionType: string
  quantity: number
  transactionDate: string
  performedBy: string
  locationId?: number
}

export interface DashboardDataResponse {
  kpis: DashboardKPIs
  activitySummary: ActivitySummaryItem[]
  recentTransactions: RecentTransaction[]
}

export interface LowStockItem {
  id: number
  sku: string
  productName: string
  locationCode: string
  locationName: string
  quantityOnHand: number
  quantityAvailable: number
  quantityAllocated: number
  updatedAtUtc: string
  stockLevel: 'Out of Stock' | 'Critical' | 'Low' | 'Warning'
}

export interface LowStockSummary {
  totalLowStockItems: number
  outOfStockItems: number
  criticalItems: number
  lowItems: number
  warningItems: number
  totalQuantityOnHand: number
  averageStockLevel: number
}

export interface OutOfStockSummary {
  totalOutOfStockSkus: number
  longestOutOfStockDays: number
  totalEstimatedLostRevenue: number
  averageOutOfStockDays: number
  criticalOosDays: number
  urgentOosDays: number
  recentOosDays: number
}

export interface OutOfStockItem {
  sku: string
  productName: string
  category: string
  lastMovementDate: string
  daysOutOfStock: number
  last30DayVelocity: number
  lastKnownPrice: number
  estimatedLostRevenue: number
  topChannel: string
}

export interface LowStockReportResponse {
  summary: LowStockSummary
  items: LowStockItem[]
  outOfStockSummary: OutOfStockSummary
  outOfStockItems: OutOfStockItem[]
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  threshold: number
}

export interface LocationSummary {
  locationId: number
  locationCode: string
  locationName: string
  totalItems: number
  totalQuantity: number
  lowStockItems: number
  outOfStockItems: number
}

export interface InventoryOverallSummary {
  totalLocations: number
  totalUniqueProducts: number
  totalInventoryItems: number
  totalQuantityOnHand: number
  totalQuantityAvailable: number
  totalQuantityAllocated: number
}

export interface InventorySummaryResponse {
  overallSummary: InventoryOverallSummary
  locationSummary: LocationSummary[]
}

// Password Reset Interfaces
export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Admin Interfaces
export interface AdminCustomerCreate {
  name: string;
  email: string;
  tenantName: string;
  skuVaultTenantToken: string;
  skuVaultUserToken: string;
}

export interface AdminCustomerUpdate {
  id: number;
  name: string;
  email: string;
  tenantName: string;
  skuVaultTenantToken: string;
  skuVaultUserToken: string;
}

export interface AdminCustomerResponse {
  id: number;
  externalId: string;
  name: string;
  email: string;
  tenantId: number;
  tenantName: string;
  lastSyncedAt: string;
  createdAt: string;
  isActive: boolean;
}

export interface AdminCustomerListResponse {
  customers: AdminCustomerResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Remove trailing slash from baseUrl if present
    this.baseUrl = API_BASE_URL.replace(/\/+$/, '');
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Ensure endpoint starts with a single slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies in all requests
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // For login endpoint, let the component handle the error
        if (endpoint === '/api/auth/login') {
          const error = await response.text();
          throw new Error(`401 - ${error || 'Invalid email or password'}`);
        }
        // For other endpoints, redirect to login
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getTransactions(
    customerId: number,
    from?: string,
    to?: string,
    page: number = 1,
    pageSize: number = 500
  ): Promise<TransactionListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.fetch<TransactionListResponse>(
      `/api/transactions/customer/${customerId}?${params.toString()}`
    );
  }

  async getTransactionsToday(customerId: number): Promise<TransactionListResponse> {
    return this.fetch<TransactionListResponse>(
      `/api/transactions/customer/${customerId}/today`
    );
  }

  async getTransactionsSummary(
    customerId: number,
    from?: string,
    to?: string
  ): Promise<TransactionSummaryResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<TransactionSummaryResponse>(
      `/api/transactions/customer/${customerId}/summary${queryString ? `?${queryString}` : ''}`
    );
  }

  async getTransactionsSummaryToday(customerId: number): Promise<TransactionSummaryResponse> {
    return this.fetch<TransactionSummaryResponse>(
      `/api/transactions/customer/${customerId}/summary/today`
    );
  }

  async getPickerPerformance(
    customerId: number,
    from?: string,
    to?: string
  ): Promise<PickerPerformanceResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<PickerPerformanceResponse>(
      `/api/transactions/customer/${customerId}/picker-performance${queryString ? `?${queryString}` : ''}`
    );
  }

  async getChannelRevenueByChannel(
    customerId: number,
    from?: string,
    to?: string
  ): Promise<ChannelRevenueResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<ChannelRevenueResponse>(
      `/api/channel-performance/customer/${customerId}/revenue${queryString ? `?${queryString}` : ''}`
    );
  }

  async getTopSkusByChannel(
    customerId: number,
    from?: string,
    to?: string,
    limit: number = 10
  ): Promise<TopSkuResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    params.append('limit', limit.toString());

    const queryString = params.toString();
    return this.fetch<TopSkuResponse>(
      `/api/channel-performance/customer/${customerId}/top-skus${queryString ? `?${queryString}` : ''}`
    );
  }

  async getChannelTrends(
    customerId: number,
    from?: string,
    to?: string
  ): Promise<ChannelTrendResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<ChannelTrendResponse>(
      `/api/channel-performance/customer/${customerId}/trends${queryString ? `?${queryString}` : ''}`
    );
  }

  async login(email: string, password: string): Promise<{ email: string; expires: string; message: string }> {
    return this.fetch<{ email: string; expires: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(request: ResetPasswordConfirm): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async changePassword(request: ChangePasswordRequest): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPerformanceMetrics(customerId: number, from?: string, to?: string): Promise<PerformanceMetrics> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<PerformanceMetrics>(
      `/api/transactions/customer/${customerId}/performance${queryString ? `?${queryString}` : ''}`
    );
  }

  async getDailyCounts(customerId: number, days: number = 30): Promise<DailyCountsResponse> {
    return this.fetch<DailyCountsResponse>(
      `/api/transactions/customer/${customerId}/daily-counts?days=${days}`
    );
  }

  async getDashboardData(customerId: number, from?: string, to?: string): Promise<DashboardDataResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const queryString = params.toString();
    return this.fetch<DashboardDataResponse>(
      `/api/transactions/customer/${customerId}/dashboard${queryString ? `?${queryString}` : ''}`
    );
  }

  // Inventory Reports
  async getLowStockReport(customerId: number, threshold: number = 10, page: number = 1, pageSize: number = 100): Promise<LowStockReportResponse> {
    const params = new URLSearchParams();
    params.append('threshold', threshold.toString());
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    return this.fetch<LowStockReportResponse>(
      `/api/inventory/customer/${customerId}/low-stock?${params.toString()}`
    );
  }

  async getInventorySummary(customerId: number): Promise<InventorySummaryResponse> {
    return this.fetch<InventorySummaryResponse>(
      `/api/inventory/customer/${customerId}/summary`
    );
  }

  // Admin API methods
  async getAdminCustomers(page = 1, pageSize = 10, search?: string): Promise<AdminCustomerListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (search) {
      params.append('search', search);
    }

    return this.fetch<AdminCustomerListResponse>(
      `/api/admin/customers?${params.toString()}`
    );
  }

  async getAdminCustomer(id: number): Promise<AdminCustomerResponse> {
    return this.fetch<AdminCustomerResponse>(`/api/admin/customers/${id}`);
  }

  async createAdminCustomer(customer: AdminCustomerCreate): Promise<AdminCustomerResponse> {
    return this.fetch<AdminCustomerResponse>('/api/admin/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async updateAdminCustomer(customer: AdminCustomerUpdate): Promise<AdminCustomerResponse> {
    return this.fetch<AdminCustomerResponse>(`/api/admin/customers/${customer.id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteAdminCustomer(id: number): Promise<{ message: string }> {
    return this.fetch<{ message: string }>(`/api/admin/customers/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
