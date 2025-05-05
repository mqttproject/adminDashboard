import axios from 'axios';

// Base API configuration
const API_URL = 'http://localhost:3000';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Create a separate axios instance for auth requests (no token needed)
const apiNoToken = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
export const apiService = {
  // Auth endpoints
  login: (username, password) => {
    return apiNoToken.post('/auth/login', { username, password });
  },

  register: (username, password) => {
    return apiNoToken.post('/auth/register', { username, password });
  },

  getProfile: () => {
    return api.get('/auth/profile');
  },

  forgotPassword: (email) => {
    return apiNoToken.post('/auth/forgot-password', { email });
  },

  // Dashboard data
  fetchHeartbeat: () => {
    return api.get('/api/heartbeat');
  },

  // Room management
  addSimulatorToRoom: (simulatorId, roomId) => {
    return api.post('/api/rooms/add-simulator', { simulatorId, roomId });
  },

  removeSimulatorFromRoom: (simulatorId, roomId) => {
    return api.post('/api/rooms/remove-simulator', { simulatorId, roomId });
  },

  // Simulator management
  updateSimulatorTitle: (simulatorId, title) => {
    return api.put('/api/simulator/update-title', { simulatorId, title });
  }
};