/**
 * 设备指纹模块
 * 用于生成和验证设备唯一标识
 * 只使用硬件相关特征，确保同一设备不同浏览器生成相同指纹
 */

export interface DeviceInfo {
  screenResolution: string;
  timezone: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
}

export interface DeviceFingerprint {
  hash: string;
  info: DeviceInfo;
  createdAt: string;
}

// 简单哈希函数
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// 收集设备硬件信息（跨浏览器一致）
function collectDeviceInfo(): DeviceInfo {
  // 只使用最稳定的硬件特征
  return {
    // 屏幕分辨率（硬件相关，跨浏览器一致）
    screenResolution: `${screen.width}x${screen.height}`,
    // 时区（系统设置，跨浏览器一致）
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // 简化平台信息，只保留操作系统类型
    platform: getPlatformType(),
    // CPU核心数（硬件相关，跨浏览器一致）
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    // 设备内存（硬件相关，跨浏览器一致）
    deviceMemory: (navigator as any).deviceMemory || 0,
    // 触摸点数（硬件相关，跨浏览器一致）
    maxTouchPoints: navigator.maxTouchPoints || 0
  };
}

// 收集旧版设备硬件信息（兼容旧数据）
function collectDeviceInfoLegacy(): DeviceInfo {
  return {
    screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0
  };
}

// 获取统一的平台类型（跨浏览器一致）
function getPlatformType(): string {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  // Windows
  if (platform.includes('win') || ua.includes('windows')) {
    return 'Windows';
  }
  // macOS
  if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) {
    return 'macOS';
  }
  // Linux
  if (platform.includes('linux') || ua.includes('linux')) {
    return 'Linux';
  }
  // iOS
  if (platform.includes('iphone') || platform.includes('ipad') || ua.includes('iphone') || ua.includes('ipad')) {
    return 'iOS';
  }
  // Android
  if (platform.includes('android') || ua.includes('android')) {
    return 'Android';
  }
  
  return 'Unknown';
}

// 生成设备指纹
export function generateFingerprint(): DeviceFingerprint {
  const info = collectDeviceInfo();
  const dataStr = JSON.stringify(info);
  const hash = simpleHash(dataStr);
  
  return {
    hash,
    info,
    createdAt: new Date().toISOString()
  };
}

// 生成旧版设备指纹（用于兼容验证）
export function generateFingerprintLegacy(): DeviceFingerprint {
  const info = collectDeviceInfoLegacy();
  const dataStr = JSON.stringify(info);
  const hash = simpleHash(dataStr);
  
  return {
    hash,
    info,
    createdAt: new Date().toISOString()
  };
}

// 序列化指纹
export function serializeFingerprint(fp: DeviceFingerprint): string {
  return JSON.stringify(fp);
}

// 反序列化指纹
export function deserializeFingerprint(str: string): DeviceFingerprint {
  return JSON.parse(str);
}

// 比较两个指纹是否匹配
export function matchFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean {
  return fp1.hash === fp2.hash;
}

// 从序列化字符串比较
export function matchFingerprintHash(hash: string, fp: DeviceFingerprint): boolean {
  return hash === fp.hash;
}
