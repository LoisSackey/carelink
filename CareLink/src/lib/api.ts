// API Base URL - Update this if your backend runs on a different port/host
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get stored token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// API call helper function
const apiCall = async (endpoint, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add authorization token if available
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Parse response body
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = data?.message || `API Error: ${response.statusText}`;

        // If rate limited (429) attempt exponential backoff retries
        if (response.status === 429 && attempt <= maxRetries) {
          const retryAfterHeader = response.headers.get('Retry-After');
          // Retry-After may be seconds or HTTP-date; try to parse seconds first
          let delayMs = 1000 * Math.pow(2, attempt - 1); // base exponential backoff 1s,2s,4s
          if (retryAfterHeader) {
            const retrySeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(retrySeconds)) {
              delayMs = retrySeconds * 1000;
            }
          }
          console.warn(`Received 429 from ${endpoint}, retrying attempt ${attempt} in ${delayMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue; // retry
        }

        console.error(`API Call Failed [${response.status}]:`, {
          endpoint,
          status: response.status,
          message: errorMessage,
          token: token ? 'present' : 'missing',
        });

        // Only throw error - let the component handle 401/429 messages appropriately
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // fetch() itself failed (network error). If we haven't exhausted retries, retry.
      if (attempt <= maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.warn(`Network error calling ${endpoint}, retrying attempt ${attempt} in ${delayMs}ms`, error);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      console.error('API call failed:', error);
      throw error;
    }
  }
};

// User API endpoints
export const userAPI = {
  register: (userData) =>
    // Support both plain JSON objects and FormData (when uploading profile picture)
    (userData instanceof FormData
      ? (() => {
          const token = getToken();
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          return fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers,
            body: userData,
          }).then(async (response) => {
            let data;
            try {
              data = await response.json();
            } catch {
              data = null;
            }

            if (!response.ok) {
              const errorMessage = data?.message || `API Error: ${response.statusText}`;
              throw new Error(errorMessage);
            }

            return data;
          });
        })()
      : apiCall('/users/register', {
          method: 'POST',
          body: JSON.stringify(userData),
        })),

  registerCaregiver: (formData: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}/users/register-caregiver`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage = data?.message || `API Error: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    });
  },

  login: (credentials) =>
    apiCall('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  googleAuth: (token: string, userType: string) =>
    apiCall('/users/google', {
      method: 'POST',
      body: JSON.stringify({ token, userType }),
    }),

  getProfile: (userId) =>
    apiCall(`/users/${userId}`, {
      method: 'GET',
    }),

  getPublicProfile: (userId) =>
    apiCall(`/users/public/${userId}`, {
      method: 'GET',
    }),

  updateProfile: (userId, data) =>
    apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateCaregiverRates: (userId, ratesData) =>
    apiCall(`/users/${userId}/rates`, {
      method: 'PUT',
      body: JSON.stringify(ratesData),
    }),

  requestDeleteAccount: (userId) => {
    const endpoint = `/users/${userId}/request-deletion`;
    console.log('Calling delete account API:', {
      fullUrl: `${API_BASE_URL}${endpoint}`,
      endpoint,
      userId,
      method: 'POST'
    });
    return apiCall(endpoint, {
      method: 'POST',
    });
  },

  approveDeleteAccount: (userId) =>
    apiCall(`/users/${userId}/approve-deletion`, {
      method: 'PUT',
    }),

  rejectDeleteAccount: (userId) =>
    apiCall(`/users/${userId}/reject-deletion`, {
      method: 'PUT',
    }),

  getCaregivers: () =>
    apiCall('/users/caregivers', {
      method: 'GET',
    }),

  getCaregiversByLocation: (location: string, useProximity?: boolean, radiusKm?: number) => {
    const params = new URLSearchParams();
    if (useProximity) params.append('useProximity', 'true');
    if (radiusKm) params.append('radiusKm', radiusKm.toString());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    return apiCall(`/users/caregivers/search/${encodeURIComponent(location)}${queryString}`, {
      method: 'GET',
    });
  },

  // Find nearby caregivers by proximity (distance-based)
  findNearbyCaregiversByProximity: (
    location: string,
    radiusKm: number = 5,
    limit: number = 20,
    coords?: { lat: number; lng: number }
  ) => {
    const params = new URLSearchParams({
      radiusKm: radiusKm.toString(),
      limit: limit.toString(),
    });
    if (coords) {
      params.set('lat', coords.lat.toString());
      params.set('lng', coords.lng.toString());
    }
    return apiCall(
      `/users/caregivers/nearby/${encodeURIComponent(location)}?${params.toString()}`,
      { method: 'GET' }
    );
  },

  // NEW: Find nearest caregiver
  findNearestCaregiver: (location: string) =>
    apiCall(`/users/caregiver/nearest/${encodeURIComponent(location)}`, {
      method: 'GET',
    }),

  // NEW: Validate if two locations are within radius
  validateLocationProximity: (location1: string, location2: string, radiusKm: number = 5) =>
    apiCall(
      `/users/validate-proximity?location1=${encodeURIComponent(location1)}&location2=${encodeURIComponent(location2)}&radiusKm=${radiusKm}`,
      { method: 'GET' }
    ),

  // Admin endpoints
  getAllUsers: () =>
    apiCall('/users', {
      method: 'GET',
    }),

  getPendingCaregivers: () =>
    apiCall('/users/pending/caregivers', {
      method: 'GET',
    }),

  approveCaregivver: (userId) =>
    apiCall(`/users/${userId}/approve`, {
      method: 'PUT',
    }),

  rejectCaregivver: (userId) =>
    apiCall(`/users/${userId}/reject`, {
      method: 'DELETE',
    }),

  deleteUser: (userId) =>
    apiCall(`/users/${userId}`, {
      method: 'DELETE',
    }),

  addAdmin: (adminData) =>
    apiCall('/users/admin/add', {
      method: 'POST',
      body: JSON.stringify(adminData),
    }),

  addUser: (userData) =>
    apiCall('/users/user/add', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  editUserAccount: (userId, data) =>
    apiCall(`/users/${userId}/edit`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deactivateUser: (userId) =>
    apiCall(`/users/${userId}/deactivate`, {
      method: 'PUT',
    }),

  activateUser: (userId) =>
    apiCall(`/users/${userId}/activate`, {
      method: 'PUT',
    }),

  forgotPassword: (email: string, userType: string) =>
    apiCall('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, userType }),
    }),

  resetPassword: (email: string, token: string, newPassword: string, confirmPassword: string, userType: string) =>
    apiCall('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword, confirmPassword, userType }),
    }),

  verifyResetToken: (email: string, token: string, userType: string) =>
    apiCall('/users/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ email, token, userType }),
    }),

  removeProfilePicture: (userId) =>
    apiCall(`/users/${userId}/remove-profile-picture`, {
      method: 'DELETE',
    }),
};

// Booking API endpoints
export const bookingAPI = {
  create: (bookingData) =>
    apiCall('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  getAll: () =>
    apiCall('/bookings', {
      method: 'GET',
    }),

  getByUserId: (userId) =>
    apiCall(`/bookings?userId=${userId}`, {
      method: 'GET',
    }),

  getByStatus: (status) =>
    apiCall(`/bookings?status=${status}`, {
      method: 'GET',
    }),

  getById: (bookingId) =>
    apiCall(`/bookings/${bookingId}`, {
      method: 'GET',
    }),

  update: (bookingId, data) =>
    apiCall(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (bookingId) =>
    apiCall(`/bookings/${bookingId}`, {
      method: 'DELETE',
    }),

  // Payment methods
  updatePayment: (bookingId, paymentData) =>
    apiCall(`/bookings/${bookingId}/payment`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    }),

  getPaymentInfo: (bookingId) =>
    apiCall(`/bookings/${bookingId}/payment`, {
      method: 'GET',
    }),

  uploadReceipt: async (bookingId, receiptFile) => {
    const formData = new FormData();
    formData.append('receipt', receiptFile);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/receipt`, {
        method: 'POST',
        body: formData,
        headers,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorMessage = data?.message || `API Error: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('Receipt upload failed:', error);
      throw error;
    }
  },

  // Paystack integration (trial)
  initializePaystack: (bookingId: string) =>
    apiCall('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),

  verifyPaystack: (reference: string) =>
    apiCall(`/payments/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
    }),

  confirmPayment: (bookingId) =>
    apiCall(`/bookings/${bookingId}/confirm-payment`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),
};

// Contact API endpoints
export const contactAPI = {
  create: (contactData) =>
    apiCall('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    }),

  getAll: () =>
    apiCall('/contacts', {
      method: 'GET',
    }),

  getById: (contactId) =>
    apiCall(`/contacts/${contactId}`, {
      method: 'GET',
    }),

  update: (contactId, data) =>
    apiCall(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (contactId) =>
    apiCall(`/contacts/${contactId}`, {
      method: 'DELETE',
    }),
};

// Notification API endpoints
export const notificationAPI = {
  create: (notificationData) =>
    apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    }),

  getAll: () =>
    apiCall('/notifications', {
      method: 'GET',
    }),

  getByUserId: (userId) =>
    apiCall(`/notifications?recipientId=${userId}`, {
      method: 'GET',
    }),

  getUnreadCount: (userId) =>
    apiCall(`/notifications/unread/${userId}`, {
      method: 'GET',
    }),

  markAsRead: (notificationId) =>
    apiCall(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    }),

  delete: (notificationId) =>
    apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE',
    }),

  clearUnread: (userId) =>
    apiCall(`/notifications/clear/${userId}`, {
      method: 'PUT',
    }),
};

// Message API endpoints
export const messageAPI = {
  sendMessage: (receiverId, content, bookingId = null) =>
    apiCall('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content, bookingId }),
    }),

  getConversation: (userId) =>
    apiCall(`/messages/conversation/${userId}`, {
      method: 'GET',
    }),

  getConversations: () =>
    apiCall('/messages/conversations', {
      method: 'GET',
    }),

  getUnreadCount: () =>
    apiCall('/messages/unread-count', {
      method: 'GET',
    }),

  markAsRead: (userId) =>
    apiCall(`/messages/read/${userId}`, {
      method: 'PUT',
    }),

  deleteMessage: (messageId) =>
    apiCall(`/messages/${messageId}`, {
      method: 'DELETE',
    }),
};

// Credential API endpoints
export const credentialAPI = {
  upload: (formData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData - browser will set it with boundary
    return fetch(`${API_BASE_URL}/credentials/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (!data.credential) throw new Error(data.message || 'Failed to upload credential');
        return data;
      });
  },

  getCaregiverCredentials: (caregiverId) =>
    apiCall(`/credentials/${caregiverId}`, {
      method: 'GET',
    }),

  getCredentialStatus: (caregiverId) =>
    apiCall(`/credentials/status/${caregiverId}`, {
      method: 'GET',
    }),

  verifyCredential: (credentialId, verificationStatus, verificationNotes = '') =>
    apiCall(`/credentials/verify/${credentialId}`, {
      method: 'PUT',
      body: JSON.stringify({ verificationStatus, verificationNotes }),
    }),

  verifyBlockchain: (credentialId, fileBuffer) =>
    apiCall(`/credentials/verify-blockchain/${credentialId}`, {
      method: 'POST',
      body: JSON.stringify({ fileBuffer }),
    }),

  deleteCredential: (credentialId) =>
    apiCall(`/credentials/${credentialId}`, {
      method: 'DELETE',
    }),

  getPendingCredentials: () =>
    apiCall('/credentials/admin/pending', {
      method: 'GET',
    }),

  getAllCredentials: (filters: { status?: string; caregiverId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.caregiverId) params.append('caregiverId', filters.caregiverId);
    return apiCall(`/credentials/admin/all?${params.toString()}`, {
      method: 'GET',
    });
  },

  downloadCredentialFile: (credentialId) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${API_BASE_URL}/credentials/download/${credentialId}`, {
      method: 'GET',
      headers,
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to download file');
        }
        // Get filename from content-disposition header
        const contentDisposition = res.headers.get('content-disposition');
        let filename = 'credential-file';
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="?([^"]+)"?/);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        const blob = await res.blob();
        return { blob, filename };
      });
  },
};

// Matching API endpoints
export const matchingAPI = {
  matchCaregivers: (familyNeeds) =>
    apiCall('/matching/match', {
      method: 'POST',
      body: JSON.stringify(familyNeeds),
    }),

  getMatchScore: (caregiverId, familyNeeds) =>
    apiCall(`/matching/score/${caregiverId}`, {
      method: 'POST',
      body: JSON.stringify(familyNeeds),
    }),

  getAvailableCaregivers: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });
    return apiCall(`/matching/caregivers?${params.toString()}`, {
      method: 'GET',
    });
  },

  getMatchingStats: () =>
    apiCall('/matching/stats', {
      method: 'GET',
    }),

  testMatching: () =>
    apiCall('/matching/test', {
      method: 'GET',
    }),
};

// Blockchain API endpoints
export const blockchainAPI = {
  storeCredential: (credentialId) =>
    apiCall(`/blockchain/store/${credentialId}`, {
      method: 'POST',
    }),

  verifyCredential: (credentialId, fileHash = null) =>
    apiCall(`/blockchain/verify/${credentialId}`, {
      method: 'POST',
      body: JSON.stringify({ fileHash }),
    }),

  getCredentialHistory: (credentialId) =>
    apiCall(`/blockchain/history/${credentialId}`, {
      method: 'GET',
    }),

  getCaregiverRecords: (caregiverId) =>
    apiCall(`/blockchain/caregiver/${caregiverId}`, {
      method: 'GET',
    }),

  generateProof: (credentialId) =>
    apiCall(`/blockchain/proof/${credentialId}`, {
      method: 'GET',
    }),

  revokeCredential: (credentialId, reason: string) =>
    apiCall(`/blockchain/revoke/${credentialId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getStats: () =>
    apiCall('/blockchain/stats', {
      method: 'GET',
    }),

  publicVerify: (credentialId: string, transactionId: string) =>
    fetch(`${API_BASE_URL}/blockchain/verify/${credentialId}/${transactionId}`)
      .then(res => res.json()),
};

export default { userAPI, bookingAPI, notificationAPI, messageAPI, credentialAPI, matchingAPI, blockchainAPI };
