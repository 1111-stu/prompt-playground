"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Square, RotateCcw, Download } from "lucide-react"
import { TestCard, type TestCard as TestCardType } from "@/components/test-card"
import type { ModelConfig } from "@/components/model-configuration"

interface CardManagerProps {
  cards: TestCardType[]
  models: ModelConfig[]
  prompt: string
  onCardsChange: (cards: TestCardType[]) => void
}

export function CardManager({ cards, models, prompt, onCardsChange }: CardManagerProps) {
  const [runningCards, setRunningCards] = useState<Set<string>>(new Set())

  const addCard = () => {
    const newCard: TestCardType = {
      id: `card-${Date.now()}`,
      modelId: models[0]?.id || "",
      status: "idle",
    }
    onCardsChange([...cards, newCard])
  }

  const removeCard = (cardId: string) => {
    onCardsChange(cards.filter((card) => card.id !== cardId))
  }

  const updateCard = (cardId: string, updates: Partial<TestCardType>) => {
    onCardsChange(cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)))
  }

  const runCard = async (cardId: string) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const model = models.find((m) => m.id === card.modelId)
    if (!model) return

    setRunningCards((prev) => new Set(prev).add(cardId))
    updateCard(cardId, { status: "running", startTime: Date.now() })

    try {
      // Simulate API call
      const responseTime = Math.random() * 3000 + 1000

      setTimeout(() => {
        const endTime = Date.now()
        const tokenCount = Math.floor(Math.random() * 500) + 100
        const cost = (tokenCount / 1000) * model.costPer1kTokens
        const hasError = Math.random() < 0.1

        if (hasError) {
          updateCard(cardId, {
            status: "error",
            error: "API request failed: Rate limit exceeded",
            endTime,
          })
        } else {
          const responses = {
            "deepseek-v3-250324": "作为DeepSeek AI，我很高兴为您提供帮助。" + prompt.slice(0, 50) + "...",
            "gpt-4-turbo": "Hello! I'm GPT-4 Turbo. " + prompt.slice(0, 100) + "...",
            "claude-3-haiku": "Hi there! I'm Claude (Haiku). " + prompt.slice(0, 80) + "...",
            "moonshot-v1-8k": "您好！我是Moonshot AI。" + prompt.slice(0, 60) + "...",
            "glm-4": "你好！我是智谱清言GLM-4。" + prompt.slice(0, 70) + "...",
          }

          updateCard(cardId, {
            status: "completed",
            response: responses[card.modelId as keyof typeof responses] || `Mock response for ${model.name}: ${prompt}`,
            endTime,
            cost,
            tokenCount,
          })
        }

        setRunningCards((prev) => {
          const newSet = new Set(prev)
          newSet.delete(cardId)
          return newSet
        })
      }, responseTime)
    } catch (error) {
      updateCard(cardId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      setRunningCards((prev) => {
        const newSet = new Set(prev)
        newSet.delete(cardId)
        return newSet
      })
    }
  }

  const stopCard = (cardId: string) => {
    updateCard(cardId, { status: "idle" })
    setRunningCards((prev) => {
      const newSet = new Set(prev)
      newSet.delete(cardId)
      return newSet
    })
  }

  const runAllCards = () => {
    cards.forEach((card) => {
      if (card.status !== "running") {
        runCard(card.id)
      }
    })
  }

  const stopAllCards = () => {
    cards.forEach((card) => {
      if (card.status === "running") {
        stopCard(card.id)
      }
    })
  }

  const resetAllCards = () => {
    onCardsChange(
      cards.map((card) => ({
        ...card,
        status: "idle" as const,
        response: undefined,
        error: undefined,
        startTime: undefined,
        endTime: undefined,
        cost: undefined,
        tokenCount: undefined,
      })),
    )
  }

  const exportResults = () => {
    const results = cards.map((card) => ({
      model: models.find((m) => m.id === card.modelId)?.name,
      status: card.status,
      response: card.response,
      error: card.error,
      cost: card.cost,
      responseTime: card.startTime && card.endTime ? card.endTime - card.startTime : undefined,
    }))

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "test-results.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const completedCount = cards.filter((card) => card.status === "completed").length
  const runningCount = cards.filter((card) => card.status === "running").length
  const totalCost = cards.reduce((sum, card) => sum + (card.cost || 0), 0)
  const avgResponseTime = cards
    .filter((card) => card.startTime && card.endTime)
    .reduce((sum, card, _, arr) => {
      const time = card.endTime! - card.startTime!
      return sum + time / arr.length
    }, 0)

  return (
    <div className="space-y-4">
      {/* Header with Stats and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">完成:</span>
            <Badge variant="outline">{completedCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">总成本:</span>
            <Badge variant="outline">${totalCost.toFixed(4)}</Badge>
          </div>
          {avgResponseTime > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">平均时间:</span>
              <Badge variant="outline">{(avgResponseTime / 1000).toFixed(1)}s</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportResults} disabled={completedCount === 0}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button size="sm" variant="outline" onClick={resetAllCards}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          {runningCount > 0 ? (
            <Button size="sm" variant="outline" onClick={stopAllCards}>
              <Square className="h-4 w-4 mr-1" />
              停止全部
            </Button>
          ) : (
            <Button size="sm" onClick={runAllCards} disabled={cards.length === 0}>
              <Play className="h-4 w-4 mr-1" />
              运行全部
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={addCard}>
            <Plus className="h-4 w-4 mr-1" />
            添加卡片
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 auto-rows-fr">
        {cards.map((card) => (
          <TestCard
            key={card.id}
            card={card}
            models={models}
            prompt={prompt}
            onModelChange={(cardId, modelId) => updateCard(cardId, { modelId })}
            onRun={runCard}
            onStop={stopCard}
            onRemove={removeCard}
            onRetry={runCard}
          />
        ))}

        {cards.length === 0 && (
          <div className="col-span-full flex items-center justify-center p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">还没有测试卡片</h3>
              <p className="text-muted-foreground mb-4">添加卡片开始测试不同的AI模型</p>
              <Button onClick={addCard}>
                <Plus className="h-4 w-4 mr-2" />
                添加第一个卡片
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
