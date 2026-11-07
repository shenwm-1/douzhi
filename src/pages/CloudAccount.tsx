/**
 * 云端账号管理页面
 * 风格：简约高级（类 iOS 设置风格）
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isAdmin } from '../lib/supabase'
import { uploadBackup, downloadBackup, getLastSyncTime } from '../services/cloudSyncService'
import StatusBar from '../components/StatusBar'
import { 
  ChevronLeft, Cloud, LogOut, RefreshCw, Shield, 
  Database, Key, Check, Loader2
} from 'lucide-react'

interface CloudData {
  apiConfigs?: unknown[]  // API配置列表
  currentApiId?: string
  summary_api_settings?: unknown
}

const CloudAccount = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [cloudData, setCloudData] = useState<CloudData | null>(null)

  // 加载用户头像
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        // 从 user_info 读取用户信息
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr)
          setUserName(userInfo.nickname || userInfo.realName || '')
        }
        // 从IndexedDB读取头像
        const { getUserInfoWithAvatar } = await import('../utils/userUtils')
        const info = await getUserInfoWithAvatar()
        if (info.avatar) {
          setUserAvatar(info.avatar)
        }
      } catch (e) {
        console.error('加载用户头像失败:', e)
      }
    }
    loadAvatar()
  }, [])

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          setUser({ email: authUser.email || '', id: authUser.id })
          setLastSync(getLastSyncTime())
          
          const admin = await isAdmin()
          setIsAdminUser(admin)
          
          // 加载云端数据预览
          try {
            const { data } = await supabase
              .from('user_backups')
              .select('backup_data')
              .eq('user_id', authUser.id)
              .single()
            
            if (data?.backup_data) {
              const backup = data.backup_data as Record<string, unknown>
              // 使用正确的键名（ls_ 前缀 + 实际存储的键）
              setCloudData({
                apiConfigs: backup.ls_apiConfigs as unknown[] | undefined,
                currentApiId: backup.ls_currentApiId as string | undefined,
                summary_api_settings: backup.ls_summary_api_settings,
              })
            }
          } catch (dbError) {
            // 没有云端数据是正常的，不报错
            console.log('暂无云端备份数据')
          }
        }
      } catch (e) {
        console.error('加载用户信息失败:', e)
      } finally {
        setLoading(false)
      }
    }
    
    loadUserInfo()
  }, [])

  const handleSync = async () => {
    if (syncing) return
    const confirmed = window.confirm('隐私提醒：这会把当前浏览器中的 API 配置（可能包含 API Key）上传到本项目原作者的 Supabase 云端数据库。若你尚未确认该云端账号归你所有，建议取消。确定继续备份吗？')
    if (!confirmed) return
    setSyncing(true)
    try {
      const result = await uploadBackup()
      if (result.success) {
        setLastSync(result.lastSyncTime || new Date().toISOString())
        alert('同步成功')
        window.location.reload()
      } else {
        alert('同步失败: ' + result.error)
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleRestore = async () => {
    if (!window.confirm('确定要从云端恢复数据吗？这将覆盖本地的API配置。')) return
    
    setSyncing(true)
    try {
      // 添加超时机制，防止无限等待
      const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: '操作超时，请重试' }), 30000)
      })
      
      const result = await Promise.race([downloadBackup(), timeoutPromise])
      
      // 先重置状态，再处理结果
      setSyncing(false)
      
      if (result.success) {
        // 使用 setTimeout 确保 UI 更新后再刷新
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } else {
        alert('恢复失败: ' + result.error)
      }
    } catch (e) {
      console.error('恢复异常:', e)
      setSyncing(false)
      alert('恢复出错: ' + String(e))
    }
  }

  const handleLogout = async () => {
    if (window.confirm('确定要退出登录吗？')) {
      await supabase.auth.signOut()
      navigate('/auth')
    }
  }

  // 解析API配置数量
  const getApiCount = () => {
    if (!cloudData?.apiConfigs) return 0
    try {
      return Array.isArray(cloudData.apiConfigs) ? cloudData.apiConfigs.length : 0
    } catch {
      return 0
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col font-serif soft-page-enter">
      {/* 顶部 - 玻璃拟态（状态栏+导航栏合并） */}
      <div className="relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/40">
        <StatusBar />
        <div className="px-5 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="text-[#5A5A5A] hover:text-[#2C2C2C] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-medium tracking-wide text-[#2C2C2C]">云端账号</h1>
          <div className="w-5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        {user ? (
          <>
            {/* 个人信息卡片 */}
            <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-5 flex items-center gap-4 shadow-sm soft-fade-in-up">
              <div className="w-14 h-14 rounded-xl bg-white/40 border border-white/30 flex items-center justify-center overflow-hidden shadow-sm">
                {userAvatar ? (
                  <img src={userAvatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-semibold">
                    {(userName || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-[#2C2C2C] truncate tracking-wide">
                    {userName || user.email.split('@')[0]}
                  </h2>
                  {isAdminUser && (
                    <span className="px-1.5 py-0.5 bg-amber-100/80 text-amber-700 text-[10px] font-bold rounded">
                      管理员
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#5A5A5A] truncate mt-0.5 font-light">{user.email}</p>
              </div>
              <span className="text-[#8C8C8C] text-xl font-light">›</span>
            </div>

            {/* 同步与备份 */}
            <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-xl overflow-hidden shadow-sm card-enter" style={{ animationDelay: '0.1s' }}>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center px-5 py-4 hover:bg-white/50 active:bg-white/60 transition-all disabled:opacity-50"
              >
                <div className="w-6 h-6 flex items-center justify-center text-green-600">
                  <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="ml-4 flex-1 text-left">
                  <span className="text-sm text-[#2C2C2C] tracking-wide">立即备份到云端</span>
                  <p className="text-xs text-[#8C8C8C] mt-0.5">
                    {lastSync ? `上次: ${new Date(lastSync).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '从未同步'}
                  </p>
                </div>
                <span className="text-[#8C8C8C] text-lg font-light">›</span>
              </button>
              <div className="mx-5 border-b border-[#2C2C2C]/10" />
              <button 
                onClick={handleRestore}
                disabled={syncing}
                className="w-full flex items-center px-5 py-4 hover:bg-white/50 active:bg-white/60 transition-all disabled:opacity-50"
              >
                <div className="w-6 h-6 flex items-center justify-center text-blue-600">
                  <Database className="w-5 h-5" />
                </div>
                <div className="ml-4 flex-1 text-left">
                  <span className="text-sm text-[#2C2C2C] tracking-wide">从云端恢复数据</span>
                  <p className="text-xs text-[#8C8C8C] mt-0.5">将覆盖本地API配置</p>
                </div>
                <span className="text-[#8C8C8C] text-lg font-light">›</span>
              </button>
            </div>

            {/* 云端数据详情 */}
            <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-xl overflow-hidden shadow-sm card-enter" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center px-5 py-4">
                <div className="w-6 h-6 flex items-center justify-center text-[#5A5A5A]">
                  <Key className="w-5 h-5" />
                </div>
                <span className="ml-4 flex-1 text-sm text-[#2C2C2C] tracking-wide">API配置数量</span>
                <span className="text-sm text-[#5A5A5A]">{getApiCount()} 个</span>
              </div>
              <div className="mx-5 border-b border-[#2C2C2C]/10" />
              <div className="flex items-center px-5 py-4">
                <div className="w-6 h-6 flex items-center justify-center text-[#5A5A5A]">
                  <Check className="w-5 h-5" />
                </div>
                <span className="ml-4 flex-1 text-sm text-[#2C2C2C] tracking-wide">当前使用</span>
                <span className="text-sm text-[#5A5A5A] max-w-[120px] truncate">
                  {cloudData?.currentApiId || '无'}
                </span>
              </div>
              <div className="mx-5 border-b border-[#2C2C2C]/10" />
              <div className="flex items-center px-5 py-4">
                <div className="w-6 h-6 flex items-center justify-center text-[#5A5A5A]">
                  <Cloud className="w-5 h-5" />
                </div>
                <span className="ml-4 flex-1 text-sm text-[#2C2C2C] tracking-wide">总结API</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-[#5A5A5A]">
                    {cloudData?.summary_api_settings ? '已存档' : '未存档'}
                  </span>
                  {!!cloudData?.summary_api_settings && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {/* 账号管理 */}
            <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-xl overflow-hidden shadow-sm card-enter" style={{ animationDelay: '0.3s' }}>
              {isAdminUser && (
                <>
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center px-5 py-4 hover:bg-white/50 active:bg-white/60 transition-all"
                  >
                    <div className="w-6 h-6 flex items-center justify-center text-amber-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="ml-4 flex-1 text-sm text-[#2C2C2C] tracking-wide">进入管理后台</span>
                    <span className="text-[#8C8C8C] text-lg font-light">›</span>
                  </button>
                  <div className="mx-5 border-b border-[#2C2C2C]/10" />
                </>
              )}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-5 py-4 hover:bg-white/50 active:bg-white/60 transition-all"
              >
                <div className="w-6 h-6 flex items-center justify-center text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="ml-4 flex-1 text-sm text-red-500 tracking-wide">退出登录</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center soft-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center mb-6 shadow-sm">
              <Cloud className="w-10 h-10 text-[#5A5A5A]" />
            </div>
            <h2 className="text-lg font-medium text-[#2C2C2C] mb-2 tracking-wide">开启云端同步</h2>
            <p className="text-sm text-[#5A5A5A] max-w-[240px] leading-relaxed mb-8 font-light">
              登录账号，在多设备间无缝同步您的配置数据
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-3 bg-[#2C2C2C] text-white rounded-full text-sm font-medium active:scale-[0.98] transition-transform shadow-sm"
            >
              登录 / 注册
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CloudAccount

