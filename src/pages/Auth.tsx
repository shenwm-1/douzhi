/**
 * 登录/注册页面
 * 极简高级设计风格
 * 支持双渠道：Supabase（国际）和 Cloudflare（国内）
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, checkBanned } from '../lib/supabase'
import { downloadBackup } from '../services/cloudSyncService'
import { cfSignIn, cfSignUp, cfGetUser, getAuthChannel } from '../services/cloudflareAuthService'
import { getDeviceId } from '../utils/deviceId'
import { ChevronRight } from 'lucide-react'

type AuthMode = 'login' | 'register'

const Auth = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // 检查是否已登录
  useEffect(() => {
    const checkSession = async () => {
      // 开发环境自动跳过登录
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isDev) {
        navigate('/')
        return
      }

      // 检查上次使用的渠道
      const lastChannel = getAuthChannel()

      if (lastChannel === 'cloudflare') {
        const cfUser = await cfGetUser()
        if (cfUser) {
          navigate('/')
          return
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          navigate('/')
          return
        }
      }
      setChecking(false)
    }
    checkSession()
  }, [navigate])

  // Supabase 登录/注册
  const handleSupabaseAuth = async () => {
    const deviceId = await getDeviceId()

    if (mode === 'register') {
      const { data: bannedDevice } = await supabase
        .from('banned_devices')
        .select('device_id, banned_reason')
        .eq('device_id', deviceId)
        .single()

      if (bannedDevice) {
        throw new Error(`此设备已被清理，无法注册新账号`)
      }

      const { data: existingUser } = await supabase
        .from('user_status')
        .select('email')
        .eq('device_id', deviceId)
        .single()

      if (existingUser) {
        throw new Error(`此设备已注册账号 ${existingUser.email}，请直接登录`)
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (data.user) {
        await supabase.from('user_status').insert({
          user_id: data.user.id,
          email: data.user.email,
          device_id: deviceId,
          is_banned: false,
          created_at: new Date().toISOString(),
        })
        localStorage.setItem('auth_channel', 'supabase')
        navigate('/')
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (data.user) {
        const banned = await checkBanned(data.user.id)
        if (banned) {
          await supabase.auth.signOut()
          throw new Error('账号已被清理')
        }
        localStorage.setItem('auth_channel', 'supabase')
        downloadBackup().catch(console.error)
        navigate('/')
      }
    }
  }

  // Cloudflare 登录/注册
  const handleCloudflareAuth = async () => {
    if (mode === 'register') {
      const result = await cfSignUp(email, password)
      if (!result.success) {
        throw new Error(result.error)
      }
      navigate('/')
    } else {
      const result = await cfSignIn(email, password)
      if (!result.success) {
        throw new Error(result.error)
      }
      navigate('/')
    }
  }

  const handleSubmit = async (e: React.FormEvent) =>
