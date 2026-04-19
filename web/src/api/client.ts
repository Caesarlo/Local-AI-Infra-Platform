import axios from 'axios'
import { toast } from 'sonner'
import { JWT_KEY } from '@/lib/constants'

const client = axios.create({
  baseURL: '/admin',
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(JWT_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('无法连接到服务器')
      return Promise.reject(error)
    }

    const { status } = error.response

    if (status === 401) {
      localStorage.removeItem(JWT_KEY)
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('权限不足')
    } else if (status >= 500) {
      toast.error('服务器错误，请稍后重试')
    }

    return Promise.reject(error)
  }
)

export default client
