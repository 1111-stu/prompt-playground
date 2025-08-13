export interface Variable {
  name: string
  value: string
  description?: string
}

export interface Prompt {
  id: number
  name: string
  content: string
  variables: Variable[]
  createdAt: Date
  updatedAt: Date
}

export interface ProjectData {
  prompts: Prompt[]
  activePromptId: number
  version: string
}
