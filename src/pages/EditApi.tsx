import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import StatusBar from '../components/StatusBar'
import { apiService } from '../services/apiService'
import { fetchModels } from '../utils/api'

const EditApi = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const existingApi = id ? apiService.getById(id) : null

  const [formData, setFormData] = useState({
    name: existingApi?.name || '',
    baseUrl: existingApi?.baseUrl || '',
    apiKey: existingApi?.apiKey || '',
    model: existingApi?.model || '',
    provider: existingApi?.provider || 'openai' as const,
    temperature: existingApi?.temperature ?? 0.6,
    maxTokens: existingApi?.maxTokens ?? 8000,
    supportsVision: existingApi?.supportsVision ?? false
  })

  const [fetchingModels, setFetchingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [showModelList, setShowModelList] = useState(false)
  const [fetchResult, setFetchResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!existingApi) {
      navigate('/api-list')
    }
  }, [existingApi, navigate])

  const providers = [
    { value: 'google', label: 'Google Gemini', example: 'https://generativelanguage.googleapis.com/v1beta' },
    { value: 'openai', label: 'OpenAI', example: 'https://api.openai.com/v1' },
    { value: 'siliconflow', label: 'SiliconFlow', example: 'https://api.siliconflow.cn/v1' },
    { value: 'custom', label: '自定义', example: '' },
  ]

  const handleProviderChange = (provider: string) => {
    const selectedProvider = providers.find(p => p.value === provider)
    setFormData({
      ...formData,
      provider: provider as any,
      baseUrl: provider === 'custom' ? '' : (selectedProvider?.example || '')
    })
    setAvailableModels([])
    setShowModelList(false)
  }

  const handleFetchModels = async () => {
    if (!formData.baseUrl || !formData.apiKey) {
      alert('请先填写API地址和密钥')
      return
    }

    if (fetchingModels) {
      return
    }

    setFetchingModels(true)
    setFetchResult(null)

    try {
      const models = await fetchModels(formData)
      if (models.length === 0) {
        setFetchResult({ success: false, message: '未找到可用模型，请手动输入' })
      } else {
        setAvailableModels(models)
        setShowModelList(true)
        if (!formData.model && models.length > 0) {
          setFormData({ ...formData, model: models[0] })
        }
        setFetchResult({ success: true, message: `成功拉取 ${models.length} 个模型` })
      }
    } catch (error: any) {
      setFetchResult({ success: false, message: error.message || '拉取模型失败' })
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSelectModel = (model: string) => {
    setFormData({ ...formData, model })
    setShowModelList(false)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('请输入节点名称')
      return
    }
    if (!formData.baseUrl || !formData.apiKey || !formData.model) {
      alert('请填写完整的连接配置')
      return
    }

    // 屏蔽特定域名
    const blockedDomains = ['heibaiwoof.com', 'api520.pro', 'api521.pro', 'api522.pro']
    const isBlocked = blockedDomains.some(domain => formData.baseUrl.toLowerCase().includes(domain))
    if (isBlocked) {
      alert('该API地址不可用，请使用其他服务商')
      return
    }

    if (id) {
      apiService.update(id, formData)
    }
    navigate('/api-list', { replace: true })
  }

  if (!existingApi) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-[#f2f4f6] relative overflow-hidden font-sans">
      
      <StatusBar />

      {/* 顶部导航栏 - 玻璃态 */}
      <div className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/api-list')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-slate-600 hover:bg-white/60 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-medium text-slate-800 tracking-wide">编辑连接</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-light tracking-wider">EDIT NODE</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-full bg-slate-800 text-white text-sm font-medium shadow-lg hover:bg-slate-700 hover:scale-105 transition-all active:scale-95"
        >
          保存修改
        </button>
      </div>

      {/* 配置表单 */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 z-0 scrollbar-hide space-y-6">

        {/* 基础信息 */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest ml-1">基础信息 <span className="text-[10px] opacity-50">BASIC INFO</span></h2>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl p-1 border border-white/50 shadow-sm">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="节点名称 (例如: 我的Gemini)"
              maxLength={30}
              className="w-full px-4 py-3 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm font-medium"
            />
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/50 shadow-sm">
            {providers.map((provider, index) => (
              <button
                key={provider.value}
                onClick={() => handleProviderChange(provider.value)}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/40 ${index < providers.length - 1 ? 'border-b border-white/30' : ''
                  }`}
              >
                <span className={`text-sm ${formData.provider === provider.value ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                  {provider.label}
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${formData.provider === provider.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300'
                  }`}>
                  {formData.provider === provider.value && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 连接配置 */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest ml-1">连接配置 <span className="text-[10px] opacity-50">CONFIGURATION</span></h2>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-light ml-1">接口地址 (Endpoint URL)</label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-300 text-sm text-slate-700 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-light ml-1">API密钥 (API Key)</label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-300 text-sm text-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 模型选择 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest ml-1">模型选择 <span className="text-[10px] opacity-50">MODEL</span></h2>
            <button
              onClick={handleFetchModels}
              disabled={fetchingModels}
              className="px-3 py-1 bg-white/50 hover:bg-white/80 text-slate-600 text-[10px] rounded-full border border-white/60 transition-all disabled:opacity-50"
            >
              {fetchingModels ? '扫描中...' : '扫描模型'}
            </button>
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl p-1 border border-white/50 shadow-sm">
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="模型名称 (例如: gpt-4)"
              className="w-full px-4 py-3 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm font-medium"
            />
          </div>

          {/* 模型列表 */}
          {showModelList && availableModels.length > 0 && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/60 shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {availableModels.map((model, index) => (
                <button
                  key={model}
                  onClick={() => handleSelectModel(model)}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-blue-50/50 transition-colors ${index < availableModels.length - 1 ? 'border-b border-slate-100/50' : ''
                    }`}
                >
                  <span className={`text-sm font-mono ${formData.model === model ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>
                    {model}
                  </span>
                  {formData.model === model && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 拉取结果提示 */}
          {fetchResult && (
            <div className={`rounded-xl p-3 border text-xs ${fetchResult.success
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-600'
                : 'bg-red-50/50 border-red-200 text-red-600'
              }`}>
              {fetchResult.message}
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div className="space-y-4">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest ml-1">高级参数 <span className="text-[10px] opacity-50">ADVANCED</span></h2>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/50 shadow-sm">
            <div className="px-5 py-4 border-b border-white/30">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500 font-light">随机性 (Temperature)</label>
                <span className="text-xs font-mono text-slate-700 bg-white/50 px-2 py-0.5 rounded-md border border-white/50">
                  {formData.temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-light">💡 Gemini 2.5 适配 1.0 左右 · Gemini 3.0 适配 0.3 左右</p>
            </div>

            <div className="px-5 py-4 border-b border-white/30">
              <label className="block text-xs text-slate-500 font-light mb-2">最大长度 (Max Tokens)</label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                placeholder="8000"
                className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm font-mono"
              />
            </div>


            <div className="px-5 py-4 flex items-center justify-between hover:bg-white/30 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, supportsVision: !formData.supportsVision })}>
              <div>
                <label className="block text-sm text-slate-800 font-medium">视觉中枢 (Visual Cortex)</label>
                <p className="text-[10px] text-slate-500 mt-0.5 font-light">开启后可识别图片内容</p>
              </div>
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.supportsVision ? 'bg-slate-700' : 'bg-slate-300'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.supportsVision ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditApi
