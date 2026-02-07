/**
 * Example: Goal Aggregate Implementation
 *
 * Demonstrates how to use the DDD, CQRS, and Event architecture
 * for implementing the Goals domain.
 */

import {
  AggregateRoot,
  UniqueEntityId,
  Result,
  TenantId,
  EmployeeId,
  Percentage,
  DateRange,
  DomainEvents,
  EventMetadata,
} from '../domain';

import {
  BaseCommand,
  CommandHandler,
  BaseQuery,
  QueryHandler,
  CommandMetadata,
  QueryMetadata,
} from '../cqrs';

import {
  GoalCreatedEvent,
  GoalProgressUpdatedEvent,
  GoalCompletedEvent,
} from '../events';

import {
  ValidationError,
  GoalError,
  NotFoundError,
} from '../errors';

// ============================================================================
// GOAL AGGREGATE
// ============================================================================

export interface GoalProps {
  tenantId: TenantId;
  ownerId: EmployeeId;
  title: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  progress: Percentage;
  weight: number;
  parentGoalId?: UniqueEntityId;
  targetDate: Date;
  completedAt?: Date;
  outcome?: GoalOutcome;
}

export type GoalType = 'OKR' | 'SMART' | 'KPI' | 'PROJECT' | 'PERSONAL';
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
export type GoalOutcome = 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED' | 'CANCELLED';

export class Goal extends AggregateRoot<GoalProps> {
  private constructor(props: GoalProps, id?: UniqueEntityId) {
    super(props, id);
  }

  // Factory method with validation
  static create(props: {
    tenantId: string;
    ownerId: string;
    title: string;
    description?: string;
    type: GoalType;
    parentGoalId?: string;
    targetDate: Date;
    weight?: number;
  }, metadata: EventMetadata): Result<Goal> {
    // Validate tenant ID
    const tenantIdResult = TenantId.create(props.tenantId);
    if (tenantIdResult.isFailure) {
      return Result.fail(tenantIdResult.getError());
    }

    // Validate owner ID
    const ownerIdResult = EmployeeId.create(props.ownerId);
    if (ownerIdResult.isFailure) {
      return Result.fail(ownerIdResult.getError());
    }

    // Validate title
    if (!props.title || props.title.trim().length < 3) {
      return Result.fail('Goal title must be at least 3 characters');
    }
    if (props.title.length > 200) {
      return Result.fail('Goal title cannot exceed 200 characters');
    }

    // Validate target date
    if (props.targetDate < new Date()) {
      return Result.fail('Target date must be in the future');
    }

    // Validate weight
    const weight = props.weight ?? 1.0;
    if (weight <= 0 || weight > 10) {
      return Result.fail('Weight must be between 0 and 10');
    }

    // Create initial progress
    const progressResult = Percentage.create(0);
    if (progressResult.isFailure) {
      return Result.fail(progressResult.getError());
    }

    const goal = new Goal({
      tenantId: tenantIdResult.getValue(),
      ownerId: ownerIdResult.getValue(),
      title: props.title.trim(),
      description: props.description?.trim() || '',
      type: props.type,
      status: 'DRAFT',
      progress: progressResult.getValue(),
      weight,
      parentGoalId: props.parentGoalId ? new UniqueEntityId(props.parentGoalId) : undefined,
      targetDate: props.targetDate,
    });

    // Add domain event
    goal.addDomainEvent(new GoalCreatedEvent(
      goal.id.toString(),
      {
        title: props.title,
        description: props.description || '',
        ownerId: props.ownerId,
        parentGoalId: props.parentGoalId,
        type: props.type,
        targetDate: props.targetDate,
        weight,
      },
      metadata
    ));

    return Result.ok(goal);
  }

  // Getters
  get tenantId(): TenantId { return this.props.tenantId; }
  get ownerId(): EmployeeId { return this.props.ownerId; }
  get title(): string { return this.props.title; }
  get description(): string { return this.props.description; }
  get type(): GoalType { return this.props.type; }
  get status(): GoalStatus { return this.props.status; }
  get progress(): Percentage { return this.props.progress; }
  get weight(): number { return this.props.weight; }
  get parentGoalId(): UniqueEntityId | undefined { return this.props.parentGoalId; }
  get targetDate(): Date { return this.props.targetDate; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get outcome(): GoalOutcome | undefined { return this.props.outcome; }

  // Business methods
  activate(metadata: EventMetadata): Result<void> {
    if (this.props.status !== 'DRAFT' && this.props.status !== 'ON_HOLD') {
      return Result.fail('Goal can only be activated from DRAFT or ON_HOLD status');
    }

    this.props.status = 'ACTIVE';
    this.incrementVersion();
    return Result.ok();
  }

  updateProgress(newProgress: number, source: 'MANUAL' | 'INTEGRATION' | 'CALCULATED', notes: string | undefined, metadata: EventMetadata): Result<void> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail('Can only update progress on active goals');
    }

    const progressResult = Percentage.create(newProgress);
    if (progressResult.isFailure) {
      return Result.fail(progressResult.getError());
    }

    const previousProgress = this.props.progress.value;
    this.props.progress = progressResult.getValue();
    this.incrementVersion();

    // Add domain event
    this.addDomainEvent(new GoalProgressUpdatedEvent(
      this.id.toString(),
      {
        previousProgress,
        newProgress,
        updateSource: source,
        notes,
      },
      metadata
    ));

    return Result.ok();
  }

  complete(outcome: GoalOutcome, metadata: EventMetadata): Result<void> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail('Can only complete active goals');
    }

    this.props.status = 'COMPLETED';
    this.props.outcome = outcome;
    this.props.completedAt = new Date();
    this.incrementVersion();

    // Add domain event
    this.addDomainEvent(new GoalCompletedEvent(
      this.id.toString(),
      {
        completedAt: this.props.completedAt,
        finalProgress: this.props.progress.value,
        outcome,
      },
      metadata
    ));

    return Result.ok();
  }

  cancel(metadata: EventMetadata): Result<void> {
    if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
      return Result.fail('Cannot cancel a completed or already cancelled goal');
    }

    this.props.status = 'CANCELLED';
    this.props.outcome = 'CANCELLED';
    this.incrementVersion();

    return Result.ok();
  }

  putOnHold(metadata: EventMetadata): Result<void> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail('Can only put active goals on hold');
    }

    this.props.status = 'ON_HOLD';
    this.incrementVersion();

    return Result.ok();
  }

  updateTitle(newTitle: string, metadata: EventMetadata): Result<void> {
    if (!newTitle || newTitle.trim().length < 3) {
      return Result.fail('Goal title must be at least 3 characters');
    }
    if (newTitle.length > 200) {
      return Result.fail('Goal title cannot exceed 200 characters');
    }

    this.props.title = newTitle.trim();
    this.incrementVersion();

    return Result.ok();
  }

  updateTargetDate(newDate: Date, metadata: EventMetadata): Result<void> {
    if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
      return Result.fail('Cannot update target date of completed or cancelled goals');
    }

    this.props.targetDate = newDate;
    this.incrementVersion();

    return Result.ok();
  }

  // Check if goal is at risk
  isAtRisk(): boolean {
    if (this.props.status !== 'ACTIVE') return false;

    const now = new Date();
    const targetDate = this.props.targetDate;
    const totalDuration = targetDate.getTime() - now.getTime();
    const remainingDays = totalDuration / (1000 * 60 * 60 * 24);

    // At risk if less than 30 days remaining and progress < 70%
    if (remainingDays < 30 && this.props.progress.value < 70) {
      return true;
    }

    // At risk if less than 7 days remaining and progress < 90%
    if (remainingDays < 7 && this.props.progress.value < 90) {
      return true;
    }

    return false;
  }
}

// ============================================================================
// COMMANDS
// ============================================================================

export class CreateGoalCommand extends BaseCommand {
  readonly commandType = 'CREATE_GOAL';

  constructor(
    public readonly payload: {
      tenantId: string;
      ownerId: string;
      title: string;
      description?: string;
      type: GoalType;
      parentGoalId?: string;
      targetDate: Date;
      weight?: number;
    },
    metadata: CommandMetadata
  ) {
    super(metadata);
  }
}

export class UpdateGoalProgressCommand extends BaseCommand {
  readonly commandType = 'UPDATE_GOAL_PROGRESS';

  constructor(
    public readonly payload: {
      goalId: string;
      progress: number;
      source: 'MANUAL' | 'INTEGRATION' | 'CALCULATED';
      notes?: string;
    },
    metadata: CommandMetadata
  ) {
    super(metadata);
  }
}

export class CompleteGoalCommand extends BaseCommand {
  readonly commandType = 'COMPLETE_GOAL';

  constructor(
    public readonly payload: {
      goalId: string;
      outcome: GoalOutcome;
    },
    metadata: CommandMetadata
  ) {
    super(metadata);
  }
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

export interface GoalRepository {
  findById(id: string, tenantId: string): Promise<Goal | null>;
  save(goal: Goal): Promise<void>;
}

export class CreateGoalCommandHandler implements CommandHandler<CreateGoalCommand, string> {
  readonly handlerName = 'CreateGoalCommandHandler';

  constructor(private goalRepository: GoalRepository) {}

  async handle(command: CreateGoalCommand): Promise<Result<string>> {
    const metadata: EventMetadata = {
      tenantId: command.metadata.tenantId,
      userId: command.metadata.userId,
      correlationId: command.metadata.correlationId,
      version: 1,
    };

    const goalResult = Goal.create(command.payload, metadata);
    if (goalResult.isFailure) {
      return Result.fail(goalResult.getError());
    }

    const goal = goalResult.getValue();
    await this.goalRepository.save(goal);

    // Dispatch domain events
    DomainEvents.dispatchEventsForAggregate(goal);

    return Result.ok(goal.id.toString());
  }
}

export class UpdateGoalProgressCommandHandler implements CommandHandler<UpdateGoalProgressCommand, void> {
  readonly handlerName = 'UpdateGoalProgressCommandHandler';

  constructor(private goalRepository: GoalRepository) {}

  async handle(command: UpdateGoalProgressCommand): Promise<Result<void>> {
    const goal = await this.goalRepository.findById(
      command.payload.goalId,
      command.metadata.tenantId
    );

    if (!goal) {
      return Result.fail('Goal not found');
    }

    const metadata: EventMetadata = {
      tenantId: command.metadata.tenantId,
      userId: command.metadata.userId,
      correlationId: command.metadata.correlationId,
      version: goal.version + 1,
    };

    const result = goal.updateProgress(
      command.payload.progress,
      command.payload.source,
      command.payload.notes,
      metadata
    );

    if (result.isFailure) {
      return result;
    }

    await this.goalRepository.save(goal);
    DomainEvents.dispatchEventsForAggregate(goal);

    return Result.ok();
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export class GetGoalQuery extends BaseQuery {
  readonly queryType = 'GET_GOAL';

  constructor(
    public readonly goalId: string,
    metadata: QueryMetadata
  ) {
    super(metadata);
  }
}

export class ListGoalsQuery extends BaseQuery {
  readonly queryType = 'LIST_GOALS';

  constructor(
    public readonly filters: {
      ownerId?: string;
      status?: GoalStatus[];
      type?: GoalType[];
      search?: string;
      page?: number;
      pageSize?: number;
    },
    metadata: QueryMetadata
  ) {
    super(metadata);
  }
}

// ============================================================================
// READ MODELS (Projections)
// ============================================================================

export interface GoalReadModel {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  progress: number;
  weight: number;
  parentGoalId?: string;
  targetDate: string;
  completedAt?: string;
  outcome?: GoalOutcome;
  isAtRisk: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalListReadModel {
  items: GoalReadModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// QUERY HANDLERS
// ============================================================================

export interface GoalReadRepository {
  findById(id: string, tenantId: string): Promise<GoalReadModel | null>;
  findAll(tenantId: string, filters: ListGoalsQuery['filters']): Promise<GoalListReadModel>;
}

export class GetGoalQueryHandler implements QueryHandler<GetGoalQuery, GoalReadModel> {
  readonly handlerName = 'GetGoalQueryHandler';

  constructor(private readRepository: GoalReadRepository) {}

  async handle(query: GetGoalQuery): Promise<Result<GoalReadModel>> {
    const goal = await this.readRepository.findById(
      query.goalId,
      query.metadata.tenantId
    );

    if (!goal) {
      return Result.fail('Goal not found');
    }

    return Result.ok(goal);
  }
}

export class ListGoalsQueryHandler implements QueryHandler<ListGoalsQuery, GoalListReadModel> {
  readonly handlerName = 'ListGoalsQueryHandler';

  constructor(private readRepository: GoalReadRepository) {}

  async handle(query: ListGoalsQuery): Promise<Result<GoalListReadModel>> {
    const goals = await this.readRepository.findAll(
      query.metadata.tenantId,
      query.filters
    );

    return Result.ok(goals);
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// Creating a goal
const command = new CreateGoalCommand(
  {
    tenantId: 'tenant-123',
    ownerId: 'employee-456',
    title: 'Complete Q1 Revenue Target',
    description: 'Achieve $1M in new revenue',
    type: 'OKR',
    targetDate: new Date('2024-03-31'),
    weight: 3,
  },
  {
    tenantId: 'tenant-123',
    userId: 'employee-456',
    correlationId: 'req-789',
    idempotencyKey: 'create-goal-xyz',
  }
);

const result = await commandBus.dispatch<string>(command);

if (result.isSuccess) {
  console.log('Goal created with ID:', result.getValue());
}

// Querying goals
const query = new ListGoalsQuery(
  {
    ownerId: 'employee-456',
    status: ['ACTIVE'],
    page: 1,
    pageSize: 20,
  },
  {
    tenantId: 'tenant-123',
    userId: 'employee-456',
    correlationId: 'req-790',
    cacheKey: 'goals:employee-456:active',
    cacheTTL: 60000,
  }
);

const goalsResult = await queryBus.dispatch<GoalListReadModel>(query);

if (goalsResult.isSuccess) {
  console.log('Goals:', goalsResult.getValue().items);
}
*/

export {
  Goal,
  GoalProps,
  GoalType,
  GoalStatus,
  GoalOutcome,
  CreateGoalCommand,
  UpdateGoalProgressCommand,
  CompleteGoalCommand,
  CreateGoalCommandHandler,
  UpdateGoalProgressCommandHandler,
  GetGoalQuery,
  ListGoalsQuery,
  GetGoalQueryHandler,
  ListGoalsQueryHandler,
  GoalReadModel,
  GoalListReadModel,
  GoalRepository,
  GoalReadRepository,
};
