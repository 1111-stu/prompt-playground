"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  RefreshCw,
  Copy,
  Settings,
  History,
  Trash2,
  Clock,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Eye,
  Code,
} from "lucide-react"
import type { TestResult } from "./test-executor"
import type { ModelConfig } from "./model-configuration"

interface ResultDisplayProps {
  results: TestResult[]
  models: ModelConfig[]
  outputFormat: "raw" | "markdown"
  onRetryModel?: (modelId: string) => void
  onRemoveResult?: (modelId: string) => void
}

export function ResultDisplay({ results, models, outputFormat, onRetryModel, onRemoveResult }: ResultDisplayProps) {
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const getModelConfig = (modelId: string) => models.find((m) => m.id === modelId)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const exportResults = () => {
    const exportData = results
      .filter((r) => r.status === "completed")
      .map((result) => ({
        model: result.modelName,
        response: result.response,
        cost: result.cost,
        tokens: result.tokenCount,
        responseTime: result.endTime && result.startTime ? (result.endTime - result.startTime) / 1000 : null,
      }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prompt-test-results-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "running":
        return "text-blue-600"
      case "cancelled":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatResponse = (response: string, format: "raw" | "markdown") => {
    if (format === "raw") {
      return response
    }
    // Simple markdown-like formatting
    return response
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
  }

  const completedResults = results.filter((r) => r.status === "completed")
  const errorResults = results.filter((r) => r.status === "error")
  const runningResults = results.filter((r) => r.status === "running")

  const totalCost = completedResults.reduce((sum, result) => sum + (result.cost || 0), 0)
  const avgResponseTime =
    completedResults.length > 0
      ? completedResults.reduce((sum, result) => {
          const time = result.endTime && result.startTime ? (result.endTime - result.startTime) / 1000 : 0
          return sum + time
        }, 0) / completedResults.length
      : 0

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-medium">准备开始测试</h3>
          <p className="text-sm text-muted-foreground">配置模型并点击"运行测试"开始并行测试</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">测试结果</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>完成: {completedResults.length}</span>
            </div>
            {errorResults.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>错误: {errorResults.length}</span>
              </div>
            )}
            {runningResults.length > 0 && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span>运行中: {runningResults.length}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>${totalCost.toFixed(4)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>总成本</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{avgResponseTime.toFixed(1)}s</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>平均响应时间</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={exportResults} disabled={completedResults.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 h-full">
          {results.map((result) => {
            const model = getModelConfig(result.modelId)
            const responseTime =
              result.endTime && result.startTime ? ((result.endTime - result.startTime) / 1000).toFixed(1) : null

            return (
              <Card key={result.modelId} className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">{result.modelName}</CardTitle>
                        <div className={`flex items-center gap-1 ${getStatusColor(result.status)}`}>
                          {getStatusIcon(result.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {result.cost && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${result.cost.toFixed(4)}</span>
                          </div>
                        )}
                        {responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{responseTime}s</span>
                          </div>
                        )}
                        {result.tokenCount && (
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{result.tokenCount} tokens</span>
                          </div>
                        )}
                        {model && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>T: {model.temperature}</span>
                            <span>Max: {model.maxTokens}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {result.status === "error" && onRetryModel && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onRetryModel(result.modelId)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>重试</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {result.response && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(result.response || "")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>复制响应</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>模型设置</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <History className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>历史记录</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {onRemoveResult && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => onRemoveResult(result.modelId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除结果</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {result.status === "running" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>正在生成响应...</span>
                        </div>
                      )}
                      {result.status === "pending" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>等待开始...</span>
                        </div>
                      )}
                      {result.status === "cancelled" && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>测试已取消</span>
                        </div>
                      )}
                      {result.status === "error" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>执行错误</span>
                          </div>
                          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded border">
                            {result.error || "发生未知错误"}
                          </div>
                        </div>
                      )}
                      {result.status === "completed" && result.response && (
                        <Tabs defaultValue="formatted" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="formatted" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              格式化
                            </TabsTrigger>
                            <TabsTrigger value="raw" className="text-xs">
                              <Code className="h-3 w-3 mr-1" />
                              原始
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="formatted" className="mt-2">
                            <div
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: formatResponse(result.response, outputFormat),
                              }}
                            />
                          </TabsContent>
                          <TabsContent value="raw" className="mt-2">
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                              {result.response}
                            </pre>
                          </TabsContent>
                        </Tabs>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
