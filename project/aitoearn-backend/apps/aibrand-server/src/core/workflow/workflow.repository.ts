/**
 * WorkflowRepository — MongoDB 持久化
 */

import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { WorkflowExecution, WorkflowExecutionDocument } from './workflow.schema'

@Injectable()
export class WorkflowRepository {
  constructor(
    @InjectModel(WorkflowExecution.name)
    private readonly model: Model<WorkflowExecutionDocument>,
  ) {}

  async create(data: Record<string, any>): Promise<WorkflowExecutionDocument> {
    return this.model.create(data)
  }

  async findById(id: string): Promise<WorkflowExecutionDocument | null> {
    return this.model.findById(id).exec()
  }

  async findByUserId(userId: string, limit = 20, skip = 0): Promise<WorkflowExecutionDocument[]> {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as any
  }

  async updateStatus(
    id: string,
    status: WorkflowExecution['status'],
    updates?: Partial<WorkflowExecution>,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status, ...updates, updatedAt: new Date() }).exec()
  }

  async addStepResult(id: string, stepResult: WorkflowExecution['steps'][number]): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      $push: { steps: stepResult },
      updatedAt: new Date(),
    }).exec()
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec()
  }
}
