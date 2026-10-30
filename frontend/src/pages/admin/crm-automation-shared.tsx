import { CheckCircle2, GitBranch, ListPlus, Mail, MessageSquare, Tag, UserPlus, Workflow } from 'lucide-react'
import { api, type CrmAutomation, type CrmAutomationInput, type CrmAutomationStep } from '@/lib/api'

export type Segments = Awaited<ReturnType<typeof api.crmSegments>>
export type Sequences = Awaited<ReturnType<typeof api.crmEmailPrograms>>
export type Action = CrmAutomationStep['action_type']
export const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
export const triggers = [
  { id: 'contact_created', title: 'Contact created', description: 'When a new contact enters your CRM, including imports and synced forms.', icon: UserPlus },
  { id: 'stage_changed', title: 'Stage changed', description: 'When an existing contact moves to another stage.', icon: GitBranch },
  { id: 'subscription_changed', title: 'Subscription changed', description: 'When a contact subscribes or unsubscribes.', icon: Mail },
  { id: 'segment_added', title: 'Added to a list or tag', description: 'When a list or tag is assigned through contact management.', icon: Tag },
] as const
export const actions = [
  { id: 'segment', title: 'Add to list or tag', description: 'Organize the contact into an audience.', icon: ListPlus },
  { id: 'remove_segment', title: 'Remove from list or tag', description: 'Remove an audience membership.', icon: Tag },
  { id: 'task', title: 'Create a task', description: 'Create a follow-up with a due date.', icon: CheckCircle2 },
  { id: 'note', title: 'Add a contact note', description: 'Record context on the contact timeline.', icon: MessageSquare },
  { id: 'sequence', title: 'Enroll in email sequence', description: 'Start a timed journey for an eligible subscriber.', icon: Mail },
] as const
export const newStep = (type: Action = 'task'): CrmAutomationStep => ({ action_type: type, segment_id: null, task_title: type === 'task' ? '' : null, task_due_days: 1, task_priority: 'normal', note_body: null, sequence_id: null })
export const blank = (): CrmAutomationInput => ({ name: '', description: '', enabled: false, trigger_type: 'contact_created', trigger_stage: null, trigger_segment_id: null, trigger_subscription_status: null, conditions: {}, steps: [newStep()] })
export const toInput = (rule: CrmAutomation): CrmAutomationInput => ({ name: rule.name, description: rule.description || '', enabled: !!rule.enabled, trigger_type: rule.trigger_type, trigger_stage: rule.trigger_stage, trigger_segment_id: rule.trigger_segment_id, trigger_subscription_status: rule.trigger_subscription_status, conditions: rule.conditions || {}, steps: rule.steps })
export const date = (value?: string|null) => value ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not run yet'
export const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export function Status({ value }: { value: string }) { return <span className={`au-status au-status--${value}`}><i/>{titleCase(value)}</span> }
export function Empty({ title, text }: { title: string; text: string }) { return <div className="au-empty"><Workflow size={29}/><h3>{title}</h3><p>{text}</p></div> }
export function triggerTitle(form: CrmAutomationInput, segments: Segments) {
  const title = triggers.find(item => item.id === form.trigger_type)?.title || 'Choose a trigger'
  return title + (form.trigger_type === 'stage_changed' && form.trigger_stage ? `: ${titleCase(form.trigger_stage)}` : form.trigger_type === 'subscription_changed' && form.trigger_subscription_status ? `: ${titleCase(form.trigger_subscription_status)}` : form.trigger_type === 'segment_added' ? `: ${segments.find(item => item.id === form.trigger_segment_id)?.name || 'Choose audience'}` : '')
}
export function actionSummary(step: CrmAutomationStep, segments: Segments, sequences: Sequences) {
  if (step.action_type === 'segment' || step.action_type === 'remove_segment') return segments.find(item => item.id === step.segment_id)?.name || 'Choose a list or tag'
  if (step.action_type === 'task') return step.task_title || 'Enter a task title'
  if (step.action_type === 'note') return step.note_body || 'Write a contact note'
  return sequences.find(item => item.id === step.sequence_id)?.name || 'Choose an email sequence'
}
export function problems(form: CrmAutomationInput, segments: Segments, sequences: Sequences) {
  const items: string[] = []
  if (!form.name.trim()) items.push('Give the automation a name.')
  if (form.trigger_type === 'segment_added' && !segments.some(item => item.id === form.trigger_segment_id)) items.push('Choose a list or tag for the trigger.')
  if (form.conditions.segment_id && !segments.some(item => item.id === form.conditions.segment_id)) items.push('Choose an available list or tag for the entry filter.')
  if (!form.steps.length) items.push('Add at least one action.')
  form.steps.forEach((step, index) => {
    const prefix = `Action ${index + 1}: `
    if (['segment','remove_segment'].includes(step.action_type) && !segments.some(item => item.id === step.segment_id)) items.push(prefix + 'choose an available list or tag.')
    if (step.action_type === 'task' && !step.task_title?.trim()) items.push(prefix + 'enter a task title.')
    if (step.action_type === 'task' && (!Number.isInteger(step.task_due_days ?? 0) || (step.task_due_days ?? 0) < 0 || (step.task_due_days ?? 0) > 365)) items.push(prefix + 'task due days must be between 0 and 365.')
    if (step.action_type === 'note' && !step.note_body?.trim()) items.push(prefix + 'write a note.')
    if (step.action_type === 'sequence' && !sequences.some(item => item.id === step.sequence_id)) items.push(prefix + 'choose an available sequence.')
  })
  return items
}
