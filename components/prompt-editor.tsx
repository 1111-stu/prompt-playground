"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Copy, Plus, X, Variable } from "lucide-react"

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  jsonMode: boolean
  onJsonModeChange: (enabled: boolean) => void
  batchMode: boolean
  onBatchModeChange: (enabled: boolean) => void
  variables: { name: string; value: string; description?: string }[]
  onVariablesChange: (variables: { name: string; value: string; description?: string }[]) => void
}

export function PromptEditor({
  value,
  onChange,
  jsonMode,
  onJsonModeChange,
  batchMode,
  onBatchModeChange,
  variables,
  onVariablesChange,
}: PromptEditorProps) {
  const [showVariables, setShowVariables] = useState(false)
  const [newVariableName, setNewVariableName] = useState("")
  const [newVariableValue, setNewVariableValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Extract variables from prompt text
  const extractVariablesFromPrompt = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((match) => match.slice(2, -2).trim()) : []
  }

  // Get variables used in current prompt
  const usedVariables = extractVariablesFromPrompt(value)

  const syncVariablesFromPrompt = (promptText: string) => {
    const foundVariables = extractVariablesFromPrompt(promptText)
    const existingVariableNames = variables.map((v) => v.name)

    // Add new variables found in prompt
    const newVariables = foundVariables.filter((varName) => !existingVariableNames.includes(varName))
    if (newVariables.length > 0) {
      const updatedVariables = [
        ...variables,
        ...newVariables.map((name) => ({ name, value: "", description: `自动从prompt中检测到的变量` })),
      ]
      onVariablesChange(updatedVariables)
    }
  }

  const handlePromptChange = (newValue: string) => {
    onChange(newValue)
    syncVariablesFromPrompt(newValue)
  }

  // Add new variable
  const addVariable = () => {
    if (newVariableName && !variables.find((v) => v.name === newVariableName)) {
      onVariablesChange([...variables, { name: newVariableName, value: newVariableValue }])
      setNewVariableName("")
      setNewVariableValue("")
    }
  }

  // Remove variable
  const removeVariable = (name: string) => {
    onVariablesChange(variables.filter((v) => v.name !== name))
  }

  // Update variable value
  const updateVariable = (name: string, newValue: string) => {
    onVariablesChange(variables.map((v) => (v.name === name ? { ...v, value: newValue } : v)))
  }

  // Insert variable at cursor position
  const insertVariable = (variableName: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + `{{${variableName}}}` + value.substring(end)
      onChange(newValue)

      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variableName.length + 4, start + variableName.length + 4)
      }, 0)
    }
  }

  // Copy prompt to clipboard
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Render prompt with variable highlighting
  const renderPromptPreview = () => {
    if (!value) return null

    let processedText = value
    usedVariables.forEach((varName) => {
      const variable = variables.find((v) => v.name === varName)
      const replacement = variable ? variable.value : `[${varName}]`
      processedText = processedText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, "g"), replacement)
    })

    return processedText
  }

  return (
    <div className="space-y-6">
      {/* Prompt Input Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Prompt</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="json-mode" className="text-sm">
              JSON Mode
            </Label>
            <Switch id="json-mode" checked={jsonMode} onCheckedChange={onJsonModeChange} />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyPrompt}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="输入你的prompt... 使用 {{variable}} 来添加变量"
            className="min-h-[200px] resize-none font-mono text-sm"
          />

          {/* Variable indicators */}
          {usedVariables.length > 0 && (
            <div className="absolute top-2 right-2 flex flex-wrap gap-1">
              {usedVariables.map((varName) => {
                const variable = variables.find((v) => v.name === varName)
                return (
                  <Badge key={varName} variant={variable ? "default" : "destructive"} className="text-xs">
                    {varName}
                  </Badge>
                )
              })}
            </div>
          )}

          {usedVariables.length > 0 && (
            <div className="text-xs text-muted-foreground">
              检测到 {usedVariables.length} 个变量: {usedVariables.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Variables Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">变量管理</Label>
          <Popover open={showVariables} onOpenChange={setShowVariables}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Variable className="h-4 w-4 mr-2" />
                变量 ({variables.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">添加新变量</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="变量名"
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={addVariable} disabled={!newVariableName}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="默认值"
                    value={newVariableValue}
                    onChange={(e) => setNewVariableValue(e.target.value)}
                  />
                </div>

                {variables.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">现有变量</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {variables.map((variable) => (
                        <div key={variable.name} className="flex items-center gap-2 p-2 border rounded">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {variable.name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => insertVariable(variable.name)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              value={variable.value}
                              onChange={(e) => updateVariable(variable.name, e.target.value)}
                              className="text-xs"
                              placeholder="变量值"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => removeVariable(variable.name)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Prompt Preview with Variables */}
      {usedVariables.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">预览 (变量已替换)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded">
              {renderPromptPreview()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Mode */}
      <div className="flex items-center gap-2">
        <Switch id="batch-mode" checked={batchMode} onCheckedChange={onBatchModeChange} />
        <Label htmlFor="batch-mode" className="text-sm">
          Batch
        </Label>
      </div>
    </div>
  )
}
