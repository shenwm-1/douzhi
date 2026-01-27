/**
 * 邀请码管理员页面
 * 独立路由：/invite-admin
 */

import { useState, useEffect } from 'react'
import { Copy, Trash2, Unlock, Plus, Lock } from 'lucide-react'
import { InviteCode } from '../types/inviteCode'
import * as inviteCodeStore from '../services/inviteCodeStore'

// 管理员密码列表（每个管理员有自己的密码）
const ADMIN_PASSWORDS: Record<string, string> = {
  '雪无尘': '雪无尘',
  'sule1029': 'sule1029',
  '韧啫喱': '韧啫喱',
  '泮个终于': '泮个终于',
  'zhizhiiloveu': 'zhizhiiloveu',
  '荷包蛋最可爱！': '荷包蛋最可爱！',
  '小艾大小姐我们喜欢你！': '小艾大小姐我们喜欢你！',
  '豆汁': 'douzhi1112',
  'zhizhi': 'zhizhi',
}

const InviteCodeAdmin = () => {
  const [isAuthed, setIsAuthed] = useState(() => {
    // 检查保存的管理员名称是否还在有效密码列表中
    const savedName = localStorage.getItem('invite_admin_name') || ''
    const isValid = localStorage.getItem('invite_admin_authed') === 'true' && 
                    Object.keys(ADMIN_PASSWORDS).includes(savedName)
    if (!isValid) {
      localStorage.removeItem('invite_admin_authed')
      localStorage.removeItem('invite_admin_name')
    }
    return isValid
  })
  const [adminName, setAdminName] = useState(() => {
    return localStorage.getItem('invite_admin_name') || ''
  })
  const [password, setPassword] = useState('')
  const [prefix, setPrefix] = useState('') // 邀请码前缀
  const [searchQuery, setSearchQuery] = useState('') // 搜索关键词
  const [statusFilter, setStatusFilter] = useState<'all' | 'bound' | 'unbound'>('all') // 状态筛选
  const [error, setError] = useState('')
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isAuthed) {
      loadCodes()
    }
  }, [isAuthed])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // 检查密码是否匹配任一管理员
    const matchedAdmin = Object.entries(ADMIN_PASSWORDS).find(([, pwd]) => pwd === password)
    if (matchedAdmin) {
      const [name] = matchedAdmin
      localStorage.setItem('invite_admin_authed', 'true')
      localStorage.setItem('invite_admin_name', name)
      setAdminName(name)
      setIsAuthed(true)
    } else {
      setError('密码错误')
    }
  }

  const loadCodes = async () => {
    setLoading(true)
    // 只加载当前管理员创建的邀请码
    const myCodes = await inviteCodeStore.getAllCodes(adminName)
    setCodes(myCodes)
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    // 创建时记录管理员名称，支持前缀
    const newCode = await inviteCodeStore.createCode(adminName, prefix.trim() || undefined)
    if (newCode) {
      setCodes([newCode, ...codes])
    }
    setGenerating(false)
  }

  const handleCopy = async (code: string) => {
    try {
      // 优先使用 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
        alert('已复制')
        return
      }
      
      // 兼容方案：使用 textarea
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (success) {
        alert('已复制')
      } else {
        // 如果还是失败，显示邀请码让用户手动复制
        prompt('请手动复制邀请码:', code)
      }
    } catch {
      // 最后的兜底方案
      prompt('请手动复制邀请码:', code)
    }
  }

  const handleUnbind = async (id: string) => {
    if (await inviteCodeStore.unbindDevice(id)) {
      loadCodes()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    if (await inviteCodeStore.deleteCode(id)) {
      setCodes(codes.filter(c => c.id !== id))
    }
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold">管理员验证</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="请输入管理员密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white px-4 py-3 rounded-xl outline-none"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-xl font-medium"
            >
              进入
            </button>
          </form>
        </div>
      </div>
    )
  }

  const boundCount = codes.filter(c => c.status === 'bound').length
  const unboundCount = codes.filter(c => c.status === 'unbound').length

  // 过滤邀请码
  const filteredCodes = codes.filter(code => {
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      if (!code.code.toLowerCase().includes(query)) return false
    }
    
    // 状态过滤
    if (statusFilter === 'bound' && code.status !== 'bound') return false
    if (statusFilter === 'unbound' && code.status !== 'unbound') return false
    
    return true
  })

  return (
    <div className="h-screen bg-[#F5F5F7] overflow-y-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">邀请码管理</h1>
          <button
            onClick={() => {
              localStorage.removeItem('invite_admin_authed')
              localStorage.removeItem('invite_admin_name')
              setIsAuthed(false)
              setAdminName('')
              setCodes([])
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            切换账号
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${
              statusFilter === 'all' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <div className="text-2xl font-bold">{codes.length}</div>
            <div className="text-xs">总计</div>
          </button>
          <button
            onClick={() => setStatusFilter('bound')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${
              statusFilter === 'bound' 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            <div className="text-2xl font-bold">{boundCount}</div>
            <div className="text-xs">已绑定</div>
          </button>
          <button
            onClick={() => setStatusFilter('unbound')}
            className={`flex-1 rounded-xl p-3 text-center transition-all ${
              statusFilter === 'unbound' 
                ? 'bg-gray-500 text-white shadow-lg' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="text-2xl font-bold">{unboundCount}</div>
            <div className="text-xs">未绑定</div>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="前缀（可选）"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            className="flex-1 bg-white px-4 py-3 rounded-xl outline-none text-sm"
            maxLength={10}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 bg-black text-white py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                生成邀请码
              </>
            )}
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索邀请码..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white px-4 py-3 rounded-xl outline-none text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '未找到匹配的邀请码' : '暂无邀请码'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCodes.map(code => (
              <div key={code.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-lg font-semibold">{code.code}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    code.status === 'bound' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {code.status === 'bound' ? '已绑定' : '未绑定'}
                  </span>
                </div>
                
                {code.boundAt && (
                  <div className="text-xs text-gray-500 mb-2">
                    绑定时间: {new Date(code.boundAt).toLocaleString()}
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCopy(code.code)}
                    className="flex-1 py-2 bg-gray-100 rounded-lg text-sm flex items-center justify-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                  {code.status === 'bound' && (
                    <button
                      onClick={() => handleUnbind(code.id)}
                      className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center justify-center gap-1"
                    >
                      <Unlock className="w-4 h-4" />
                      解绑
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(code.id)}
                    className="py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InviteCodeAdmin
