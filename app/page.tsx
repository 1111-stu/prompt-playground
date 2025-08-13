"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronUp,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Copy,
  MoreHorizontal,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PromptEditor } from "@/components/prompt-editor"
import { ModelConfiguration, type ModelConfig, DEFAULT_MODELS } from "@/components/model-configuration"
import { CardManager } from "@/components/card-manager"
import type { TestCard } from "@/components/test-card"
import { TaskManager } from "@/components/task-manager"
import { usePrompts } from "@/hooks/use-prompts"
import type { Variable } from "@/lib/types"

export default function PromptTestingPlatform() {
  const {
    prompts,
    activePromptId,
    currentPrompt,
    isLoaded,
    setActivePromptId,
    addPrompt,
    deletePrompt,
    updatePrompt,
    duplicatePrompt,
  } = usePrompts()

  const [jsonMode, setJsonMode] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS)
  const [showModelConfig, setShowModelConfig] = useState(false)
  const [showTaskManager, setShowTaskManager] = useState(false)
  const [cards, setCards] = useState<TestCard[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Don't render until data is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const updatePromptContent = (content: string) => {
    if (currentPrompt) {
      updatePrompt(currentPrompt.id, { content })
    }
  }

  const updatePromptVariables = (variables: Variable[]) => {
    if (currentPrompt) {
      updatePrompt(currentPrompt.id, { variables })
    }
  }

  // Process prompt with variables
  const getProcessedPrompt = () => {
    let processedPrompt = currentPrompt?.content || ""
    currentPrompt?.variables.forEach((variable) => {
      processedPrompt = processedPrompt.replace(new RegExp(`\\{\\{${variable.name}\\}\\}`, "g"), variable.value)
    })
    return processedPrompt
  }

  const loadSession = (session: any) => {
    if (currentPrompt) {
      updatePrompt(currentPrompt.id, {
        content: session.prompt,
        variables: session.variables,
      })
    }
    setModels(session.modelConfigs)
    if (session.cards) {
      setCards(session.cards)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-2 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-9 w-9 p-0"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>

          <Tabs value={activePromptId.toString()} onValueChange={(value) => setActivePromptId(Number.parseInt(value))}>
            <div className="flex items-center gap-2">
              <TabsList className="h-9">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="flex items-center group">
                    <TabsTrigger value={prompt.id.toString()} className="text-sm pr-1">
                      {prompt.name}
                    </TabsTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicatePrompt(prompt.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          复制
                        </DropdownMenuItem>
                        {prompts.length > 1 && (
                          <DropdownMenuItem onClick={() => deletePrompt(prompt.id)} className="text-destructive">
                            <X className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </TabsList>
              <Button variant="outline" size="sm" onClick={addPrompt} className="h-9 w-9 p-0 bg-transparent">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)] relative">
        <div
          className={`
            ${sidebarCollapsed ? "w-0" : "w-96"} 
            transition-all duration-300 ease-in-out
            border-r border-border bg-card overflow-hidden
            flex-shrink-0
          `}
        >
          <div
            className={`w-96 p-6 overflow-y-auto h-full ${sidebarCollapsed ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
          >
            <div className="space-y-6">
              <PromptEditor
                value={currentPrompt?.content || ""}
                onChange={updatePromptContent}
                jsonMode={jsonMode}
                onJsonModeChange={setJsonMode}
                batchMode={batchMode}
                onBatchModeChange={setBatchMode}
                variables={currentPrompt?.variables || []}
                onVariablesChange={updatePromptVariables}
              />

              {/* Model Configuration Section */}
              <Collapsible open={showModelConfig} onOpenChange={setShowModelConfig}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-transparent">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      模型配置 ({models.filter((m) => m.enabled).length}/{models.length})
                    </span>
                    {showModelConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <ModelConfiguration models={models} onModelsChange={setModels} />
                </CollapsibleContent>
              </Collapsible>

              {/* Task Manager Section */}
              <Collapsible open={showTaskManager} onOpenChange={setShowTaskManager}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-transparent">
                    <span className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      任务管理
                    </span>
                    {showTaskManager ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <TaskManager
                    currentPrompt={getProcessedPrompt()}
                    currentVariables={currentPrompt?.variables || []}
                    models={models}
                    results={[]}
                    onLoadSession={loadSession}
                    onClearResults={() => setCards([])}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 min-w-0">
          <CardManager cards={cards} models={models} prompt={getProcessedPrompt()} onCardsChange={setCards} />
        </div>
      </div>
    </div>
  )
}
