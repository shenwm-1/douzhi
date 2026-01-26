/**
 * 邀请码验证组件 - 一机一码版本
 * 支持设备绑定验证
 */

import { useState, useEffect, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { generateFingerprint, DeviceFingerprint } from '../utils/deviceFingerprint'
import * as inviteCodeStore from '../services/inviteCodeStore'

interface InviteCodeCheckProps {
  children: ReactNode
}

const InviteCodeCheck = ({ children }: InviteCodeCheckProps) => {
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null)

  useEffect(() => {
    const init = async () => {
      // 开发环境跳过邀请码验证
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isDev) {
        setIsVerified(true)
        setLoading(false)
        return
      }

      // 生成设备指纹
      const fp = generateFingerprint()
      setFingerprint(fp)

      // 检查本地验证状态
      const verifiedCode = localStorage.getItem('verified_invite_code')

      if (verifiedCode) {
        // 每次都从服务器验证，确保数据最新
        const result = await inviteCodeStore.verifyCode(verifiedCode, fp)
        if (result.success) {
          setIsVerified(true)
          // 更新本地存储时间戳
          localStorage.setItem('invite_code_time', new Date().toISOString())
        } else {
          // 验证失败，清除本地状态
          localStorage.removeItem('invite_code_verified')
          localStorage.removeItem('verified_invite_code')
          localStorage.removeItem('verified_device_hash')
          localStorage.removeItem('invite_code_time')
        }
      }

      setLoading(false)
    }

    init()
  }, [])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedCode = inviteCode.trim().toUpperCase()
    if (!trimmedCode) {
      setError('请输入邀请码')
      return
    }

    if (!fingerprint) {
      setError('设备识别失败，请刷新重试')
      return
    }

    setVerifying(true)

    const result = await inviteCodeStore.verifyCode(trimmedCode, fingerprint)

    if (result.success) {
      // 保存到 localStorage，确保持久化
      localStorage.setItem('invite_code_verified', 'true')
      localStorage.setItem('verified_invite_code', trimmedCode)
      localStorage.setItem('verified_device_hash', fingerprint.hash)
      localStorage.setItem('invite_code_time', new Date().toISOString())
      setIsVerified(true)
    } else {
      if (result.reason === 'bound_to_other_device') {
        setError('此邀请码已在其他设备使用')
      } else {
        setError('邀请码无效')
      }
    }

    setVerifying(false)
  }

  if (loading) return null
  if (isVerified) return <>{children}</>

  // 验证界面
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-6 hover:scale-105 duration-500 transition-transform">
            <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-wide mb-1">豆汁</h1>
          <p className="text-xs text-[#86868b] tracking-wider uppercase">DOUZHI</p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="space-y-4">
            <div className="group relative">
              <input
                type="text"
                placeholder="请输入邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-white/50 backdrop-blur-xl border-none text-[#1d1d1f] placeholder:text-[#86868b] text-[15px] px-5 py-4 rounded-2xl focus:ring-0 focus:bg-white transition-all shadow-sm group-hover:shadow-md outline-none font-mono tracking-wider"
                maxLength={30}
                autoFocus
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-black text-white py-4 rounded-2xl text-[16px] font-semibold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-xl shadow-black/20"
          >
            {verifying ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                验证邀请码
                <ChevronRight className="w-5 h-5 opacity-70" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#86868b] text-xs tracking-wide">
            请输入正确的邀请码以继续使用
          </p>
        </div>
      </div>
    </div>
  )
}

export default InviteCodeCheck
