/**
 * 邀请码验证组件
 *
 * 这是个人 Fork 版本：不再要求输入邀请码。
 * 保留原有组件接口，避免影响 App.tsx 中的调用方式。
 */

import type { ReactNode } from 'react'

interface InviteCodeCheckProps {
  children: ReactNode
}

const InviteCodeCheck = ({ children }: InviteCodeCheckProps) => {
  return <>{children}</>
}

export default InviteCodeCheck
