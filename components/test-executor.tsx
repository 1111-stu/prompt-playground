"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Square, RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import type { ModelConfig } from "./model-configuration"

export interface TestResult {
  modelId: string
  modelName: string
  status: "pending" | "running" | "completed" | "error" | "cancelled"
  response?: string
  error?: string
  startTime?: number
  endTime?: number
  cost?: number
  tokenCount?: number
}

interface TestExecutorProps {
  models: ModelConfig[]
  prompt: string
  onResultsChange: (results: TestResult[]) => void
  results: TestResult[]
}

export function TestExecutor({ models, prompt, onResultsChange, results }: TestExecutorProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const enabledModels = models.filter((m) => m.enabled)

  // Mock API call simulation
  const simulateAPICall = async (model: ModelConfig, prompt: string): Promise<TestResult> => {
    const startTime = Date.now()

    // Simulate different response times for different models
    const responseTime = Math.random() * 3000 + 1000 // 1-4 seconds

    return new Promise((resolve) => {
      setTimeout(() => {
        const endTime = Date.now()
        const tokenCount = Math.floor(Math.random() * 500) + 100
        const cost = (tokenCount / 1000) * model.costPer1kTokens

        // Simulate occasional errors
        const hasError = Math.random() < 0.1 && model.id !== "gpt-4-turbo" // 10% error rate, but not for GPT-4

        if (hasError) {
          resolve({
            modelId: model.id,
            modelName: model.name,
            status: "error",
            error: "API request failed: Rate limit exceeded",
            startTime,
            endTime,
          })
        } else {
          // Generate mock responses based on model
          const responses = {
            "deepseek-v3-250324": "作为DeepSeek AI，我很高兴为您提供帮助。" + prompt.slice(0, 50) + "...",
            "gpt-4-turbo": "Hello! I'm GPT-4 Turbo. " + prompt.slice(0, 100) + "...",
            "claude-3-haiku": "Hi there! I'm Claude (Haiku). " + prompt.slice(0, 80) + "...",
            "moonshot-v1-8k": "您好！我是Moonshot AI。" + prompt.slice(0, 60) + "...",
            "glm-4": "你好！我是智谱清言GLM-4。" + prompt.slice(0, 70) + "...",
          }

          resolve({
            modelId: model.id,
            modelName: model.name,
            status: "completed",
            response: responses[model.id as keyof typeof responses] || "Mock response for " + model.name,
            startTime,
            endTime,
            cost,
            tokenCount,
          })
        }
      }, responseTime)
    })
  }

  const runTests = useCallback(async () => {
    if (!prompt.trim() || enabledModels.length === 0) return

    setIsRunning(true)
    setProgress(0)

    // Initialize results
    const initialResults: TestResult[] = enabledModels.map((model) => ({
      modelId: model.id,
      modelName: model.name,
      status: "pending",
    }))

    onResultsChange(initialResults)

    // Start all tests in parallel
    const testPromises = enabledModels.map(async (model, index) => {
      // Update status to running
      onResultsChange((prev) =>
        prev.map((result) => (result.modelId === model.id ? { ...result, status: "running" } : result)),
      )

      try {
        const result = await simulateAPICall(model, prompt)

        // Update with completed result
        onResultsChange((prev) => prev.map((r) => (r.modelId === model.id ? result : r)))

        // Update progress
        setProgress(((index + 1) / enabledModels.length) * 100)

        return result
      } catch (error) {
        const errorResult: TestResult = {
          modelId: model.id,
          modelName: model.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }

        onResultsChange((prev) => prev.map((r) => (r.modelId === model.id ? errorResult : r)))
        return errorResult
      }
    })

    try {
      await Promise.all(testPromises)
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }, [prompt, enabledModels, onResultsChange])

  const cancelTests = useCallback(() => {
    setIsRunning(false)
    onResultsChange((prev) =>
      prev.map((result) => (result.status === "running" ? { ...result, status: "cancelled" } : result)),
    )
  }, [onResultsChange])

  const retryFailedTests = useCallback(async () => {
    const failedResults = results.filter((r) => r.status === "error")
    if (failedResults.length === 0) return

    setIsRunning(true)

    for (const failedResult of failedResults) {
      const model = models.find((m) => m.id === failedResult.modelId)
      if (!model) continue

      // Update status to running
      onResultsChange((prev) =>
        prev.map((result) => (result.modelId === model.id ? { ...result, status: "running" } : result)),
      )

      try {
        const result = await simulateAPICall(model, prompt)
        onResultsChange((prev) => prev.map((r) => (r.modelId === model.id ? result : r)))
      } catch (error) {
        const errorResult: TestResult = {
          modelId: model.id,
          modelName: model.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }
        onResultsChange((prev) => prev.map((r) => (r.modelId === model.id ? errorResult : r)))
      }
    }

    setIsRunning(false)
  }, [results, models, prompt, onResultsChange])

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-orange-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pending: "secondary",
      running: "default",
      completed: "default",
      error: "destructive",
      cancelled: "secondary",
    } as const

    const labels = {
      pending: "等待中",
      running: "运行中",
      completed: "已完成",
      error: "错误",
      cancelled: "已取消",
    }

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    )
  }

  const completedCount = results.filter((r) => r.status === "completed").length
  const errorCount = results.filter((r) => r.status === "error").length
  const runningCount = results.filter((r) => r.status === "running").length

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">测试执行器</CardTitle>
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <Button size="sm" onClick={runTests} disabled={!prompt.trim() || enabledModels.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  运行测试 ({enabledModels.length})
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={cancelTests}>
                  <Square className="h-4 w-4 mr-2" />
                  取消测试
                </Button>
              )}
              {errorCount > 0 && !isRunning && (
                <Button size="sm" variant="outline" onClick={retryFailedTests}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试失败 ({errorCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>测试进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Status Summary */}
          {results.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>完成: {completedCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 text-blue-500" />
                <span>运行中: {runningCount}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>错误: {errorCount}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Status List */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">测试状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div key={result.modelId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium text-sm">{result.modelName}</div>
                      {result.endTime && result.startTime && (
                        <div className="text-xs text-muted-foreground">
                          用时: {((result.endTime - result.startTime) / 1000).toFixed(1)}s
                          {result.cost && ` | 成本: $${result.cost.toFixed(4)}`}
                          {result.tokenCount && ` | Tokens: ${result.tokenCount}`}
                        </div>
                      )}
                      {result.error && <div className="text-xs text-red-500">{result.error}</div>}
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
