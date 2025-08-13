"use client"

import { useState, useEffect } from "react"
import type { Prompt, ProjectData } from "@/lib/types"
import { saveToStorage, loadFromStorage, createDefaultPrompt } from "@/lib/storage"

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [activePromptId, setActivePromptId] = useState<number>(1)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) {
      setPrompts(stored.prompts)
      setActivePromptId(stored.activePromptId)
    } else {
      // Create default prompt if no stored data
      const defaultPrompt = createDefaultPrompt(1)
      defaultPrompt.content = "你好，我是{{name}}，我想了解关于{{topic}}的信息。"
      defaultPrompt.variables = [
        { name: "name", value: "小明" },
        { name: "topic", value: "人工智能" },
      ]
      setPrompts([defaultPrompt])
      setActivePromptId(1)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded && prompts.length > 0) {
      const projectData: ProjectData = {
        prompts,
        activePromptId,
        version: "1.0.0",
      }
      saveToStorage(projectData)
    }
  }, [prompts, activePromptId, isLoaded])

  const addPrompt = () => {
    const newId = Math.max(...prompts.map((p) => p.id), 0) + 1
    const newPrompt = createDefaultPrompt(newId)
    setPrompts((prev) => [...prev, newPrompt])
    setActivePromptId(newId)
    return newPrompt
  }

  const deletePrompt = (id: number) => {
    if (prompts.length <= 1) return // Don't delete the last prompt

    setPrompts((prev) => prev.filter((p) => p.id !== id))

    // If deleting active prompt, switch to another one
    if (id === activePromptId) {
      const remaining = prompts.filter((p) => p.id !== id)
      setActivePromptId(remaining[0]?.id || 1)
    }
  }

  const updatePrompt = (id: number, updates: Partial<Prompt>) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p)))
  }

  const duplicatePrompt = (id: number) => {
    const original = prompts.find((p) => p.id === id)
    if (!original) return

    const newId = Math.max(...prompts.map((p) => p.id)) + 1
    const now = new Date()
    const duplicated: Prompt = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    }

    setPrompts((prev) => [...prev, duplicated])
    setActivePromptId(newId)
    return duplicated
  }

  const currentPrompt = prompts.find((p) => p.id === activePromptId)

  return {
    prompts,
    activePromptId,
    currentPrompt,
    isLoaded,
    setActivePromptId,
    addPrompt,
    deletePrompt,
    updatePrompt,
    duplicatePrompt,
  }
}
