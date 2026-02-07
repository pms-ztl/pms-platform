/**
 * Domain-Driven Design Core Architecture
 *
 * This module provides the foundational building blocks for implementing
 * Domain-Driven Design across the PMS platform.
 */

// ============================================================================
// VALUE OBJECTS - Immutable domain primitives with business rules
// ============================================================================

export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// Employee ID Value Object
export class EmployeeId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<EmployeeId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('EmployeeId cannot be empty');
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
      return Result.fail('EmployeeId contains invalid characters');
    }
    return Result.ok(new EmployeeId(value));
  }

  get value(): string {
    return this.props.value;
  }
}

// Tenant ID Value Object
export class TenantId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<TenantId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('TenantId cannot be empty');
    }
    return Result.ok(new TenantId(value));
  }

  get value(): string {
    return this.props.value;
  }
}

// Rating Value Object with business rules
export class Rating extends ValueObject<{ value: number; scale: RatingScale }> {
  private constructor(value: number, scale: RatingScale) {
    super({ value, scale });
  }

  static create(value: number, scale: RatingScale = RatingScale.FIVE_POINT): Result<Rating> {
    const maxValue = scale === RatingScale.FIVE_POINT ? 5 :
                     scale === RatingScale.TEN_POINT ? 10 : 4;

    if (value < 1 || value > maxValue) {
      return Result.fail(`Rating must be between 1 and ${maxValue}`);
    }
    return Result.ok(new Rating(value, scale));
  }

  get value(): number {
    return this.props.value;
  }

  get scale(): RatingScale {
    return this.props.scale;
  }

  normalize(): number {
    const maxValue = this.props.scale === RatingScale.FIVE_POINT ? 5 :
                     this.props.scale === RatingScale.TEN_POINT ? 10 : 4;
    return this.props.value / maxValue;
  }
}

export enum RatingScale {
  FIVE_POINT = 'FIVE_POINT',
  TEN_POINT = 'TEN_POINT',
  FOUR_POINT = 'FOUR_POINT'
}

// Percentage Value Object
export class Percentage extends ValueObject<{ value: number }> {
  private constructor(value: number) {
    super({ value });
  }

  static create(value: number): Result<Percentage> {
    if (value < 0 || value > 100) {
      return Result.fail('Percentage must be between 0 and 100');
    }
    return Result.ok(new Percentage(value));
  }

  get value(): number {
    return this.props.value;
  }

  toDecimal(): number {
    return this.props.value / 100;
  }
}

// Email Value Object
export class Email extends ValueObject<{ value: string }> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(value: string) {
    super({ value: value.toLowerCase() });
  }

  static create(value: string): Result<Email> {
    if (!value || !Email.EMAIL_REGEX.test(value)) {
      return Result.fail('Invalid email format');
    }
    return Result.ok(new Email(value));
  }

  get value(): string {
    return this.props.value;
  }

  get domain(): string {
    return this.props.value.split('@')[1];
  }
}

// DateRange Value Object
export class DateRange extends ValueObject<{ start: Date; end: Date }> {
  private constructor(start: Date, end: Date) {
    super({ start, end });
  }

  static create(start: Date, end: Date): Result<DateRange> {
    if (end < start) {
      return Result.fail('End date must be after start date');
    }
    return Result.ok(new DateRange(start, end));
  }

  get start(): Date {
    return this.props.start;
  }

  get end(): Date {
    return this.props.end;
  }

  contains(date: Date): boolean {
    return date >= this.props.start && date <= this.props.end;
  }

  durationInDays(): number {
    return Math.ceil((this.props.end.getTime() - this.props.start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Money Value Object
export class Money extends ValueObject<{ amount: number; currency: string }> {
  private constructor(amount: number, currency: string) {
    super({ amount, currency: currency.toUpperCase() });
  }

  static create(amount: number, currency: string): Result<Money> {
    if (amount < 0) {
      return Result.fail('Amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      return Result.fail('Currency must be a 3-letter ISO code');
    }
    return Result.ok(new Money(amount, currency));
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Result<Money> {
    if (this.props.currency !== other.currency) {
      return Result.fail('Cannot add money with different currencies');
    }
    return Money.create(this.props.amount + other.amount, this.props.currency);
  }
}

// ============================================================================
// ENTITY BASE - Identity-based domain objects
// ============================================================================

export abstract class Entity<T> {
  protected readonly _id: UniqueEntityId;
  protected props: T;

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id || new UniqueEntityId();
    this.props = props;
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) return false;
    if (this === entity) return true;
    return this._id.equals(entity._id);
  }
}

export class UniqueEntityId extends ValueObject<{ value: string }> {
  constructor(id?: string) {
    super({ value: id || UniqueEntityId.generateId() });
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}

// ============================================================================
// AGGREGATE ROOT - Transactional consistency boundary
// ============================================================================

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];
  private _version: number = 0;

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  get version(): number {
    return this._version;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    DomainEvents.markAggregateForDispatch(this);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  protected incrementVersion(): void {
    this._version++;
  }
}

// ============================================================================
// DOMAIN EVENTS - Cross-aggregate communication
// ============================================================================

export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly metadata: EventMetadata;
}

export interface EventMetadata {
  tenantId: string;
  userId: string;
  correlationId: string;
  causationId?: string;
  version: number;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  abstract readonly eventType: string;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: Record<string, unknown>,
    public readonly metadata: EventMetadata
  ) {
    this.eventId = UniqueEntityId.prototype.constructor.call({}, undefined).toString();
    this.occurredOn = new Date();
  }
}

// Domain Events Registry
export class DomainEvents {
  private static handlersMap: Map<string, Array<(event: DomainEvent) => void>> = new Map();
  private static markedAggregates: AggregateRoot<unknown>[] = [];

  public static markAggregateForDispatch(aggregate: AggregateRoot<unknown>): void {
    const found = this.markedAggregates.find(a => a.equals(aggregate));
    if (!found) {
      this.markedAggregates.push(aggregate);
    }
  }

  public static dispatchEventsForAggregate(aggregate: AggregateRoot<unknown>): void {
    for (const event of aggregate.domainEvents) {
      this.dispatch(event);
    }
    aggregate.clearEvents();
    this.removeAggregateFromDispatchList(aggregate);
  }

  public static register(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.handlersMap.has(eventType)) {
      this.handlersMap.set(eventType, []);
    }
    this.handlersMap.get(eventType)!.push(handler);
  }

  public static clearHandlers(): void {
    this.handlersMap.clear();
  }

  private static dispatch(event: DomainEvent): void {
    const handlers = this.handlersMap.get(event.eventType) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  private static removeAggregateFromDispatchList(aggregate: AggregateRoot<unknown>): void {
    const index = this.markedAggregates.findIndex(a => a.equals(aggregate));
    if (index !== -1) {
      this.markedAggregates.splice(index, 1);
    }
  }
}

// ============================================================================
// RESULT TYPE - Explicit success/failure handling
// ============================================================================

export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _error?: string;
  private readonly _value?: T;

  private constructor(isSuccess: boolean, error?: string, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._error = error;
    this._value = value;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error('Cannot get value from failed result');
    }
    return this._value as T;
  }

  public getError(): string {
    if (this.isSuccess) {
      throw new Error('Cannot get error from successful result');
    }
    return this._error as string;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  public static combine(results: Result<unknown>[]): Result<void> {
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.getError());
      }
    }
    return Result.ok();
  }

  public map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail(this._error!);
    }
    return Result.ok(fn(this._value!));
  }

  public flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail(this._error!);
    }
    return fn(this._value!);
  }
}

// ============================================================================
// SPECIFICATION PATTERN - Business rule encapsulation
// ============================================================================

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

// ============================================================================
// REPOSITORY INTERFACE - Persistence abstraction
// ============================================================================

export interface Repository<T extends AggregateRoot<unknown>> {
  findById(id: UniqueEntityId): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(aggregate: T): Promise<void>;
}

export interface ReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(criteria?: Record<string, unknown>): Promise<T[]>;
  count(criteria?: Record<string, unknown>): Promise<number>;
}

// ============================================================================
// UNIT OF WORK - Transaction management
// ============================================================================

export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  registerNew<T extends AggregateRoot<unknown>>(aggregate: T): void;
  registerDirty<T extends AggregateRoot<unknown>>(aggregate: T): void;
  registerDeleted<T extends AggregateRoot<unknown>>(aggregate: T): void;
}

// ============================================================================
// DOMAIN SERVICE INTERFACE
// ============================================================================

export interface DomainService {
  readonly name: string;
}

// Export all types
export type {
  Specification,
  Repository,
  ReadRepository,
  UnitOfWork,
  DomainService,
};
