"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Play, Square, Copy, Trash2, RefreshCw, Clock, DollarSign, Zap, Eye, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModelConfig } from "@/components/model-configuration"

export interface TestCard {
  id: string
  modelId: string
  status: "idle" | "running" | "completed" | "error"
  response?: string
  error?: string
  startTime?: number
  endTime?: number
  cost?: number
  tokenCount?: number
}

interface TestCardProps {
  card: TestCard
  models: ModelConfig[]
  prompt: string
  onModelChange: (cardId: string, modelId: string) => void
  onRun: (cardId: string) => void
  onStop: (cardId: string) => void
  onRemove: (cardId: string) => void
  onRetry: (cardId: string) => void
}

export function TestCard({ card, models, prompt, onModelChange, onRun, onStop, onRemove, onRetry }: TestCardProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted")

  const selectedModel = models.find((m) => m.id === card.modelId)
  const responseTime = card.startTime && card.endTime ? card.endTime - card.startTime : 0

  const getStatusColor = () => {
    switch (card.status) {
      case "running":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusText = () => {
    switch (card.status) {
      case "running":
        return "运行中"
      case "completed":
        return "已完成"
      case "error":
        return "错误"
      default:
        return "待运行"
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Card className="h-full flex flex-col min-h-[400px] max-h-[600px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Select value={card.modelId} onValueChange={(value) => onModelChange(card.id, value)}>
                <SelectTrigger className="w-full max-w-[140px]">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor())} />
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {getStatusText()}
              </Badge>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {card.status === "running" ? (
                <Button size="sm" variant="outline" onClick={() => onStop(card.id)}>
                  <Square className="h-3 w-3" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onRun(card.id)}>
                  <Play className="h-3 w-3" />
                </Button>
              )}

              {card.status === "error" && (
                <Button size="sm" variant="outline" onClick={() => onRetry(card.id)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => onRemove(card.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {(card.cost !== undefined || responseTime > 0 || card.tokenCount) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {card.cost !== undefined && (
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <DollarSign className="h-3 w-3" />${card.cost.toFixed(5)}
                </div>
              )}
              {responseTime > 0 && (
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {(responseTime / 1000).toFixed(1)}s
                </div>
              )}
              {card.tokenCount && (
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Zap className="h-3 w-3" />
                  {card.tokenCount} tokens
                </div>
              )}
              {selectedModel && (
                <div className="flex items-center gap-1 whitespace-nowrap">
                  T: {selectedModel.temperature} Max: {selectedModel.maxTokens}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* View Mode Toggle */}
        {(card.response || card.error) && (
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "formatted" ? "default" : "outline"}
                onClick={() => setViewMode("formatted")}
                className="h-7 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                格式化
              </Button>
              <Button
                size="sm"
                variant={viewMode === "raw" ? "default" : "outline"}
                onClick={() => setViewMode("raw")}
                className="h-7 px-2"
              >
                <Code className="h-3 w-3 mr-1" />
                原始
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(card.response || card.error || "")}
              className="h-7 px-2 ml-auto"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          {card.status === "idle" && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">点击运行按钮开始测试</p>
              </div>
            </div>
          )}

          {card.status === "running" && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm">正在运行...</p>
              </div>
            </div>
          )}

          {card.status === "error" && (
            <div className="h-full overflow-y-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="bg-red-100 rounded-full p-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 mb-1">执行错误</p>
                    <p className="text-sm text-red-600 break-words">{card.error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {card.status === "completed" && card.response && (
            <div className="h-full overflow-hidden">
              <Textarea
                value={card.response}
                readOnly
                className="h-full resize-none border-0 bg-transparent p-0 focus-visible:ring-0 overflow-y-auto"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
