"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Save,
  FolderOpen,
  History,
  Trash2,
  Download,
  Upload,
  Play,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import type { TestResult } from "./test-executor"
import type { ModelConfig } from "./model-configuration"

interface TaskSession {
  id: string
  name: string
  timestamp: number
  prompt: string
  variables: Array<{ name: string; value: string }>
  modelConfigs: ModelConfig[]
  results: TestResult[]
  status: "completed" | "running" | "paused" | "failed"
}

interface TaskManagerProps {
  currentPrompt: string
  currentVariables: Array<{ name: string; value: string }>
  models: ModelConfig[]
  results: TestResult[]
  onLoadSession?: (session: TaskSession) => void
  onClearResults?: () => void
}

export function TaskManager({
  currentPrompt,
  currentVariables,
  models,
  results,
  onLoadSession,
  onClearResults,
}: TaskManagerProps) {
  const [sessions, setSessions] = useState<TaskSession[]>([])
  const [sessionName, setSessionName] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [disabledTasks, setDisabledTasks] = useState<Set<string>>(new Set())

  // Task definitions based on current state
  const tasks = [
    {
      id: "prompt-validation",
      name: "Prompt验证",
      description: "验证Prompt格式和变量",
      status: currentPrompt.trim() ? "ready" : "pending",
      enabled: !disabledTasks.has("prompt-validation"),
    },
    {
      id: "model-selection",
      name: "模型选择",
      description: "选择和配置AI模型",
      status: models.filter((m) => m.enabled).length > 0 ? "ready" : "pending",
      enabled: !disabledTasks.has("model-selection"),
    },
    {
      id: "variable-processing",
      name: "变量处理",
      description: "处理Prompt中的变量",
      status: currentVariables.length > 0 ? "ready" : "ready",
      enabled: !disabledTasks.has("variable-processing"),
    },
    {
      id: "parallel-execution",
      name: "并行执行",
      description: "并行调用多个AI模型",
      status: results.some((r) => r.status === "running")
        ? "running"
        : results.some((r) => r.status === "completed")
          ? "completed"
          : "pending",
      enabled: !disabledTasks.has("parallel-execution"),
    },
    {
      id: "result-collection",
      name: "结果收集",
      description: "收集和格式化结果",
      status: results.filter((r) => r.status === "completed").length > 0 ? "completed" : "pending",
      enabled: !disabledTasks.has("result-collection"),
    },
  ]

  const saveSession = () => {
    if (!sessionName.trim()) return

    const newSession: TaskSession = {
      id: Date.now().toString(),
      name: sessionName,
      timestamp: Date.now(),
      prompt: currentPrompt,
      variables: currentVariables,
      modelConfigs: models,
      results: results,
      status: results.some((r) => r.status === "running")
        ? "running"
        : results.some((r) => r.status === "error")
          ? "failed"
          : "completed",
    }

    setSessions((prev) => [newSession, ...prev])
    setSessionName("")
  }

  const loadSession = (session: TaskSession) => {
    if (onLoadSession) {
      onLoadSession(session)
    }
  }

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  const exportSessions = () => {
    const exportData = {
      sessions,
      exportTime: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prompt-test-sessions-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importSessions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions((prev) => [...data.sessions, ...prev])
        }
      } catch (error) {
        console.error("Failed to import sessions:", error)
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const toggleTask = (taskId: string) => {
    setDisabledTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "running":
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      case "ready":
        return <Play className="h-4 w-4 text-blue-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "running":
        return "text-blue-600"
      case "ready":
        return "text-blue-600"
      case "pending":
        return "text-gray-400"
      default:
        return "text-red-600"
    }
  }

  const enabledTasks = tasks.filter((t) => t.enabled)
  const completedTasks = enabledTasks.filter((t) => t.status === "completed")
  const runningTasks = enabledTasks.filter((t) => t.status === "running")

  return (
    <div className="space-y-4">
      {/* Task Management Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">任务管理</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {completedTasks.length}/{enabledTasks.length} 完成
              </Badge>
              {runningTasks.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {runningTasks.length} 运行中
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task List */}
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  <Switch checked={task.enabled} onCheckedChange={() => toggleTask(task.id)} size="sm" />
                  <div className="flex items-center gap-2">
                    {getTaskStatusIcon(task.enabled ? task.status : "pending")}
                    <div>
                      <div className={`text-sm font-medium ${task.enabled ? "" : "text-muted-foreground"}`}>
                        {task.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{task.description}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {task.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{task.enabled ? "任务已启用" : "任务已禁用"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDisabledTasks(new Set())} className="text-xs">
              全部启用
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisabledTasks(new Set(tasks.map((t) => t.id)))}
              className="text-xs"
            >
              全部禁用
            </Button>
            {onClearResults && (
              <Button variant="outline" size="sm" onClick={onClearResults} className="text-xs bg-transparent">
                <RotateCcw className="h-3 w-3 mr-1" />
                重置
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">会话管理</CardTitle>
            <div className="flex items-center gap-2">
              <Popover open={showHistory} onOpenChange={setShowHistory}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    历史 ({sessions.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">测试历史</h4>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={exportSessions}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>导出会话</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                <label htmlFor="import-sessions">
                                  <Upload className="h-3 w-3" />
                                  <input
                                    id="import-sessions"
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={importSessions}
                                  />
                                </label>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>导入会话</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">暂无历史会话</div>
                    ) : (
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {sessions.map((session) => (
                            <div key={session.id} className="p-2 border rounded space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{session.name}</div>
                                <Badge variant="outline" className="text-xs">
                                  {session.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(session.timestamp).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {session.results.filter((r) => r.status === "completed").length} 个结果
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => loadSession(session)}
                                >
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  加载
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-destructive"
                                  onClick={() => deleteSession(session.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  删除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Save Current Session */}
          <div className="flex gap-2">
            <Input
              placeholder="会话名称..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={saveSession} disabled={!sessionName.trim() || !currentPrompt.trim()}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>

          {/* Current Session Info */}
          {(currentPrompt || results.length > 0) && (
            <div className="p-2 bg-muted rounded text-xs space-y-1">
              <div className="font-medium">当前会话</div>
              {currentPrompt && (
                <div className="text-muted-foreground">
                  Prompt: {currentPrompt.slice(0, 50)}
                  {currentPrompt.length > 50 ? "..." : ""}
                </div>
              )}
              <div className="text-muted-foreground">
                变量: {currentVariables.length} 个 | 模型: {models.filter((m) => m.enabled).length} 个 | 结果:{" "}
                {results.filter((r) => r.status === "completed").length} 个
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
