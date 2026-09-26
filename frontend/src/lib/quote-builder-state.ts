import type { Configuration, ProjectType } from './quote-builder'

// Retain a project's answers when revisiting its card; clear incompatible data
// only when the client deliberately chooses a different solution or goal.
export function chooseProject(current: Configuration, project_type: string, discovery = ''): Configuration {
  if (current.project_type === project_type && current.discovery === discovery) return current
  return { project_type, discovery, answers: {}, features: [] }
}

export function detailsComplete(type: ProjectType, configuration: Configuration): boolean {
  return type.questions.every(q => q.options.some(option => option.label === configuration.answers[q.id]))
}
