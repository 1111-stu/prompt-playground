"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Settings, Zap, DollarSign } from "lucide-react"

export interface ModelConfig {
  id: string
  name: string
  provider: string
  enabled: boolean
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  costPer1kTokens: number
  maxContextLength: number
}

interface ModelConfigurationProps {
  models: ModelConfig[]
  onModelsChange: (models: ModelConfig[]) => void
}

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "deepseek-v3-250324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kTokens: 0.0001,
    maxContextLength: 32768,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4-Turbo",
    provider: "OpenAI",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kTokens: 0.01,
    maxContextLength: 128000,
  },
  {
    id: "claude-3-haiku",
    name: "Haiku",
    provider: "Anthropic",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kTokens: 0.00025,
    maxContextLength: 200000,
  },
  {
    id: "moonshot-v1-8k",
    name: "Moonshot-1-8K",
    provider: "Moonshot",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kTokens: 0.0002,
    maxContextLength: 8192,
  },
  {
    id: "glm-4",
    name: "GLM-4",
    provider: "Zhipu",
    enabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    costPer1kTokens: 0.005,
    maxContextLength: 128000,
  },
]

export function ModelConfiguration({ models, onModelsChange }: ModelConfigurationProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Initialize models if empty
  if (models.length === 0) {
    onModelsChange(DEFAULT_MODELS)
  }

  const updateModel = (modelId: string, updates: Partial<ModelConfig>) => {
    onModelsChange(models.map((model) => (model.id === modelId ? { ...model, ...updates } : model)))
  }

  const toggleModel = (modelId: string) => {
    updateModel(modelId, { enabled: !models.find((m) => m.id === modelId)?.enabled })
  }

  const enabledModels = models.filter((m) => m.enabled)
  const totalCost = enabledModels.reduce((sum, model) => sum + model.costPer1kTokens, 0)

  return (
    <div className="space-y-4">
      {/* Model Overview */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">模型配置</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{enabledModels.length} 个模型已启用</span>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>预估成本: ${totalCost.toFixed(4)}/1k tokens</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          {enabledModels.length}/{models.length}
        </Badge>
      </div>

      {/* Model List */}
      <div className="space-y-2">
        {models.map((model) => (
          <Card key={model.id} className={`transition-all ${model.enabled ? "border-primary/20" : "opacity-60"}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={model.enabled} onCheckedChange={() => toggleModel(model.id)} />
                  <div>
                    <CardTitle className="text-sm">{model.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {model.provider}
                      </Badge>
                      <span>${model.costPer1kTokens.toFixed(4)}/1k</span>
                      <span>{model.maxContextLength.toLocaleString()} ctx</span>
                    </div>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!model.enabled}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{model.name} 配置</h4>
                        <div className="text-xs text-muted-foreground">调整模型参数以获得最佳效果</div>
                      </div>

                      <div className="space-y-4">
                        {/* Temperature */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Temperature</Label>
                            <span className="text-xs text-muted-foreground">{model.temperature}</span>
                          </div>
                          <Slider
                            value={[model.temperature]}
                            onValueChange={([value]) => updateModel(model.id, { temperature: value })}
                            max={2}
                            min={0}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="text-xs text-muted-foreground">控制输出的随机性</div>
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                          <Label className="text-xs">Max Tokens</Label>
                          <Input
                            type="number"
                            value={model.maxTokens}
                            onChange={(e) =>
                              updateModel(model.id, { maxTokens: Number.parseInt(e.target.value) || 2048 })
                            }
                            min={1}
                            max={model.maxContextLength}
                            className="text-xs"
                          />
                        </div>

                        {/* Top P */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Top P</Label>
                            <span className="text-xs text-muted-foreground">{model.topP}</span>
                          </div>
                          <Slider
                            value={[model.topP]}
                            onValueChange={([value]) => updateModel(model.id, { topP: value })}
                            max={1}
                            min={0}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        {/* Frequency Penalty */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Frequency Penalty</Label>
                            <span className="text-xs text-muted-foreground">{model.frequencyPenalty}</span>
                          </div>
                          <Slider
                            value={[model.frequencyPenalty]}
                            onValueChange={([value]) => updateModel(model.id, { frequencyPenalty: value })}
                            max={2}
                            min={-2}
                            step={0.1}
                            className="w-full"
                          />
                        </div>

                        {/* Presence Penalty */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Presence Penalty</Label>
                            <span className="text-xs text-muted-foreground">{model.presencePenalty}</span>
                          </div>
                          <Slider
                            value={[model.presencePenalty]}
                            onValueChange={([value]) => updateModel(model.id, { presencePenalty: value })}
                            max={2}
                            min={-2}
                            step={0.1}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModelsChange(models.map((m) => ({ ...m, enabled: true })))}
          className="text-xs"
        >
          全部启用
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModelsChange(models.map((m) => ({ ...m, enabled: false })))}
          className="text-xs"
        >
          全部禁用
        </Button>
        <Button variant="outline" size="sm" onClick={() => onModelsChange(DEFAULT_MODELS)} className="text-xs">
          重置配置
        </Button>
      </div>
    </div>
  )
}

export { DEFAULT_MODELS }
