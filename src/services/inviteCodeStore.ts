/**
 * 邀请码存储服务
 * 使用Supabase进行数据持久化
 */

import { supabase } from '../lib/supabase';
import { InviteCode, generateUniqueCode } from '../types/inviteCode';
import { DeviceFingerprint } from '../utils/deviceFingerprint';

export type VerifyResult =
  | { success: true; code: InviteCode }
  | { success: false; reason: 'invalid' | 'bound_to_other_device' };

// 数据库行类型
interface InviteCodeRow {
  id: string;
  code: string;
  status: string;
  device_fingerprint: string | null;
  bound_at: string | null;
  created_at: string;
  created_by: string | null;
  note: string | null;
}

// 转换数据库行到InviteCode
function rowToInviteCode(row: InviteCodeRow): InviteCode {
  return {
    id: row.id,
    code: row.code,
    status: row.status as 'unbound' | 'bound',
    deviceFingerprint: row.device_fingerprint || undefined,
    boundAt: row.bound_at || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || 'admin',
    note: row.note || undefined
  };
}

// 获取所有邀请码（可按管理员筛选）
export async function getAllCodes(adminName?: string): Promise<InviteCode[]> {
  let query = supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false });

  // 如果指定了管理员，只返回该管理员创建的
  if (adminName) {
    query = query.eq('created_by', adminName);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取邀请码失败:', error);
    return [];
  }

  return (data || []).map(rowToInviteCode);
}

// 根据code字符串查找
export async function getByCode(code: string): Promise<InviteCode | null> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInviteCode(data);
}

// 创建新邀请码
export async function createCode(adminName: string, prefix?: string): Promise<InviteCode | null> {
  // 生成邀请码，如果有前缀则加上
  const randomPart = generateUniqueCode();
  const code = prefix ? `${prefix.toUpperCase()}-${randomPart}` : randomPart;
  
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      status: 'unbound',
      created_by: adminName,
      note: null
    })
    .select()
    .single();

  if (error) {
    console.error('创建邀请码失败:', error);
    return null;
  }

  return rowToInviteCode(data);
}

// 绑定设备
export async function bindDevice(codeId: string, fingerprint: DeviceFingerprint): Promise<boolean> {
  const { error } = await supabase
    .from('invite_codes')
    .update({
      status: 'bound',
      device_fingerprint: fingerprint.hash,
      bound_at: new Date().toISOString()
    })
    .eq('id', codeId);

  if (error) {
    console.error('绑定设备失败:', error);
    return false;
  }

  return true;
}

// 解绑设备
export async function unbindDevice(codeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('invite_codes')
    .update({
      status: 'unbound',
      device_fingerprint: null,
      bound_at: null
    })
    .eq('id', codeId);

  if (error) {
    console.error('解绑设备失败:', error);
    return false;
  }

  return true;
}

// 删除邀请码
export async function deleteCode(codeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('invite_codes')
    .delete()
    .eq('id', codeId);

  if (error) {
    console.error('删除邀请码失败:', error);
    return false;
  }

  return true;
}

// 验证邀请码（兼容旧版指纹）
export async function verifyCode(code: string, fingerprint: DeviceFingerprint): Promise<VerifyResult> {
  // 直接从数据库获取最新数据，不依赖缓存
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) {
    return { success: false, reason: 'invalid' };
  }

  const inviteCode = rowToInviteCode(data);

  // 未绑定，进行绑定
  if (inviteCode.status === 'unbound') {
    const bound = await bindDevice(inviteCode.id, fingerprint);
    if (bound) {
      return { 
        success: true, 
        code: { ...inviteCode, status: 'bound', deviceFingerprint: fingerprint.hash } 
      };
    }
    return { success: false, reason: 'invalid' };
  }

  // 已绑定，检查是否是同一设备（新版指纹）
  if (inviteCode.deviceFingerprint === fingerprint.hash) {
    return { success: true, code: inviteCode };
  }

  // 兼容旧版指纹：尝试用旧版算法验证
  const { generateFingerprintLegacy } = await import('../utils/deviceFingerprint');
  const legacyFingerprint = generateFingerprintLegacy();
  
  if (inviteCode.deviceFingerprint === legacyFingerprint.hash) {
    // 旧版指纹匹配，自动升级到新版指纹
    await bindDevice(inviteCode.id, fingerprint);
    return { success: true, code: inviteCode };
  }

  // 绑定到其他设备
  return { success: false, reason: 'bound_to_other_device' };
}
