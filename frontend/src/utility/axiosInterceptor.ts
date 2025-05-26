import axios from 'axios'
import { getLocalStorage } from './helper'

// Use the server URL from environment variables
const baseURL = import.meta.env.VITE_SERVER_URL || '/api'

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 60000, // Increase timeout to 60 seconds
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getLocalStorage('jwt')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default axiosInstance
