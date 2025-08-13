import type { ProjectData, Prompt } from "./types"

const STORAGE_KEY = "prompt-testing-platform"
const STORAGE_VERSION = "1.0.0"

export function saveToStorage(data: ProjectData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

export function loadFromStorage(): ProjectData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored) as ProjectData

    // Convert date strings back to Date objects
    data.prompts = data.prompts.map((prompt) => ({
      ...prompt,
      createdAt: new Date(prompt.createdAt),
      updatedAt: new Date(prompt.updatedAt),
    }))

    return data
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return null
  }
}

export function createDefaultPrompt(id: number): Prompt {
  const now = new Date()
  return {
    id,
    name: `Prompt ${id}`,
    content: "",
    variables: [],
    createdAt: now,
    updatedAt: now,
  }
}
