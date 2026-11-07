/**
 * 云同步服务
 * 处理数据的备份和恢复
 */

import { supabase, checkBanned } from '../lib/supabase'

// 需要同步的localStorage键（精简版：只同步API配置）
const SYNC_KEYS = [
  'apiConfigs',           // API配置列表（最重要！）
  'currentApiId',         // 当前使用的API ID
  'apiSettings',          // 当前API的详细设置
  'summary_api_settings', // 总结API设置
]

// 暂不同步IndexedDB（节省空间）
const SYNC_STORES: string[] = []

export interface SyncResult {
  success: boolean
  error?: string
  lastSyncTime?: string
}

/**
 * 收集所有需要备份的数据
 */
const collectBackupData = async (): Promise<Record<string, unknown>> => {
  const data: Record<string, unknown> = {}
  
  // 收集 localStorage 数据
  for (const key of SYNC_KEYS) {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        data[`ls_${key}`] = JSON.parse(value)
      } catch {
        data[`ls_${key}`] = value
      }
    }
  }
  
  // 收集 IndexedDB 数据
  try {
    const { getAllKeys, getItem } = await import('../utils/indexedDBManager')
    
    for (const store of SYNC_STORES) {
      try {
        const keys = await getAllKeys(store)
        if (keys.length > 0) {
          const items: Record<string, unknown> = {}
          for (const key of keys) {
            const value = await getItem(store, key)
            if (value !== null) {
              items[key] = value
            }
          }
          if (Object.keys(items).length > 0) {
            data[`idb_${store}`] = items
          }
        }
      } catch (e) {
        console.warn(`备份 ${store} 失败:`, e)
      }
    }
  } catch (e) {
    console.warn('IndexedDB 备份失败:', e)
  }
  
  return data
}

/**
 * 上传备份数据到云端
 */
export const uploadBackup = async (): Promise<SyncResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }
    
    // 检查是否被封禁
    const banned = await checkBanned(user.id)
    if (banned) {
      return { success: false, error: '账号已被清理' }
    }
    
    const backupData = await collectBackupData()
    const now = new Date().toISOString()
    
    // 使用 upsert 更新或插入备份
    const { error } = await supabase
      .from('user_backups')
      .upsert({
        user_id: user.id,
        backup_data: backupData,
        updated_at: now,
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.error('上传备份失败:', error)
      return { success: false, error: error.message }
    }
    
    // 更新本地同步时间
    localStorage.setItem('last_cloud_sync', now)
    
    return { success: true, lastSyncTime: now }
  } catch (e) {
    console.error('备份异常:', e)
    return { success: false, error: String(e) }
  }
}

/**
 * 从云端下载并恢复备份数据
 */
export const downloadBackup = async (): Promise<SyncResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '未登录' }
    }
    
    // 检查是否被封禁
    const banned = await checkBanned(user.id)
    if (banned) {
      return { success: false, error: '账号已被清理' }
    }
    
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_data, updated_at')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // 没有备份数据
        return { success: true, lastSyncTime: undefined }
      }
      return { success: false, error: error.message }
    }
    
    if (!data?.backup_data) {
      return { success: true, lastSyncTime: undefined }
    }
    
    // 恢复 localStorage 数据
    const backupData = data.backup_data as Record<string, unknown>
    for (const [key, value] of Object.entries(backupData)) {
      if (key.startsWith('ls_')) {
        const realKey = key.slice(3)
        localStorage.setItem(realKey, JSON.stringify(value))
      }
    }
    
    // 恢复 IndexedDB 数据
    try {
      const { setItem } = await import('../utils/indexedDBManager')
      
      for (const [key, value] of Object.entries(backupData)) {
        if (key.startsWith('idb_')) {
          const storeName = key.slice(4)
          const items = value as Record<string, unknown>
          
          for (const [itemKey, itemValue] of Object.entries(items)) {
            try {
              await setItem(storeName, itemKey, itemValue)
            } catch (e) {
              console.warn(`恢复 ${storeName}/${itemKey} 失败:`, e)
            }
          }
        }
      }
    } catch (e) {
      console.warn('IndexedDB 恢复失败:', e)
    }
    
    localStorage.setItem('last_cloud_sync', data.updated_at)
    
    return { success: true, lastSyncTime: data.updated_at }
  } catch (e) {
    console.error('恢复异常:', e)
    return { success: false, error: String(e) }
  }
}

/**
 * 获取上次同步时间
 */
export const getLastSyncTime = (): string | null => {
  return localStorage.getItem('last_cloud_sync')
}

/**
 * 自动同步（如果已登录）
 */
/**
 * 自动同步已停用：避免在用户不知情时将 API 配置上传至原作者 Supabase。
 * 用户仍可在云端账号页面主动选择手动备份。
 */
export const autoSync = async (): Promise<void> => {
  return
}
