/**
 * Workflow MongoDB Schemas
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

export type WorkflowExecutionDocument = HydratedDocument<WorkflowExecution>

@Schema({ timestamps: true })
export class WorkflowExecution {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  status!: 'pending' | 'running' | 'waiting_confirm' | 'completed' | 'failed' | 'cancelled'

  @Prop({ required: true, type: Object })
  input!: {
    query: string
    platforms: string[]
    industry?: string
    brand?: string
    contentType?: string
    count?: number
  }

  @Prop({ type: [Object], default: [] })
  steps!: Array<{
    name: string
    status: string
    data: Record<string, any>
    summary?: string
    error?: string
    startedAt?: Date
    completedAt?: Date
  }>

  @Prop()
  completedAt?: Date

  @Prop()
  error?: string
}

export const WorkflowExecutionSchema = SchemaFactory.createForClass(WorkflowExecution)
