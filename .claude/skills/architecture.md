# Code Quality & Architecture Skills

## SOLID Principles

### Single Responsibility Principle (SRP)
- **Definition**: A class/module should have only one reason to change
- **Implementation**: Each class handles one specific concern or responsibility
- **Benefits**: Easier testing, better maintainability, reduced coupling
- **Code Smells**: God classes, classes with multiple unrelated methods, mixed concerns
- **Refactoring**: Extract classes, separate concerns, create focused modules
- **Examples**: Separating data access from business logic, UI from data manipulation

### Open/Closed Principle (OCP)
- **Definition**: Software entities should be open for extension, closed for modification
- **Implementation**: Use abstractions, interfaces, inheritance, composition
- **Benefits**: Reduced risk of breaking existing code, easier to add features
- **Patterns**: Strategy pattern, decorator pattern, plugin architecture
- **Refactoring**: Replace conditionals with polymorphism, use dependency injection
- **Examples**: Plugin systems, middleware chains, configurable behaviors

### Liskov Substitution Principle (LSP)
- **Definition**: Subtypes must be substitutable for their base types
- **Implementation**: Maintain contracts, respect preconditions/postconditions
- **Benefits**: Reliable inheritance hierarchies, predictable behavior
- **Violations**: Strengthening preconditions, weakening postconditions, throwing unexpected exceptions
- **Refactoring**: Favor composition over inheritance, use interfaces appropriately
- **Examples**: Base class methods work correctly with derived class instances

### Interface Segregation Principle (ISP)
- **Definition**: Clients should not depend on interfaces they don't use
- **Implementation**: Create smaller, focused interfaces instead of large, monolithic ones
- **Benefits**: Reduced coupling, easier testing, clearer contracts
- **Code Smells**: Fat interfaces, implementing methods with empty bodies or exceptions
- **Refactoring**: Split interfaces, role-based interfaces, segregate by client needs
- **Examples**: Separate read/write interfaces, granular repository methods

### Dependency Inversion Principle (DIP)
- **Definition**: Depend on abstractions, not concretions; high-level modules shouldn't depend on low-level modules
- **Implementation**: Use interfaces/abstract classes, dependency injection
- **Benefits**: Decoupled code, easier testing with mocks, flexible architecture
- **Patterns**: Dependency injection, inversion of control containers, service locator
- **Refactoring**: Extract interfaces, inject dependencies, use constructor injection
- **Examples**: Repository pattern, service layer abstractions, plugin interfaces

## Clean Code Principles

### Meaningful Names
- **Variables**: Descriptive, intention-revealing names; avoid abbreviations
- **Functions**: Verb phrases describing actions; consistent naming conventions
- **Classes**: Noun phrases; single responsibility reflected in name
- **Avoid**: Single-letter names (except loop counters), Hungarian notation, cryptic abbreviations
- **Context**: Names should be searchable, pronounceable, and contextually clear
- **Examples**: `getUserById()` not `get()`, `isActive` not `flag`, `CustomerRepository` not `CR`

### Function Quality
- **Size**: Small functions (ideally 5-15 lines), single level of abstraction
- **Parameters**: Minimize parameter count (0-2 ideal, 3 acceptable, 4+ requires refactoring)
- **Side Effects**: Avoid hidden side effects, make effects explicit
- **Command-Query Separation**: Functions should either do something or answer something, not both
- **Error Handling**: Use exceptions, not error codes; don't return null
- **DRY**: Extract repeated logic into reusable functions

### Code Structure
- **Vertical Formatting**: Newspaper metaphor - important concepts first, details later
- **Horizontal Formatting**: Short lines (80-120 characters), avoid deep nesting
- **Comments**: Code should be self-documenting; comments explain why, not what
- **Dead Code**: Remove commented code, unused functions, unreachable code
- **Consistency**: Follow team conventions, consistent formatting, naming patterns
- **Organization**: Related code stays together, logical grouping, clear dependencies

### Object-Oriented Design
- **Encapsulation**: Hide implementation details, expose minimal interface
- **Data Abstraction**: Objects hide data, expose operations; avoid data structures as objects
- **Law of Demeter**: Talk to friends, not strangers; avoid chaining (a.getB().getC().doSomething())
- **Tell, Don't Ask**: Tell objects what to do, don't ask for data to act on
- **Composition Over Inheritance**: Favor has-a over is-a relationships
- **Immutability**: Prefer immutable objects, reduce shared mutable state

### Error Handling
- **Use Exceptions**: Prefer exceptions over error codes
- **Checked vs Unchecked**: Use unchecked exceptions for programming errors, checked for recoverable conditions
- **Exception Hierarchy**: Create meaningful exception hierarchies, domain-specific exceptions
- **Context**: Provide context with exceptions, stack traces, error messages
- **Don't Return Null**: Return empty collections, use Optional/Maybe, use null object pattern
- **Don't Pass Null**: Validate inputs, throw exceptions for null arguments

## DRY (Don't Repeat Yourself)

### Core Principles
- **Definition**: Every piece of knowledge should have single, unambiguous representation
- **Scope**: Code, documentation, data, configuration - avoid duplication everywhere
- **Benefits**: Single source of truth, easier maintenance, reduced bugs
- **Cost**: Over-abstraction can harm readability; balance DRY with clarity
- **Rule of Three**: Duplicate once, refactor on third occurrence

### Code Duplication Types
- **Identical Code**: Exact duplicates - extract to function/method
- **Similar Code**: Slight variations - parameterize differences, use templates
- **Algorithmic Duplication**: Same logic, different implementations - abstract algorithm
- **Data Duplication**: Repeated data structures - centralize data definitions
- **Configuration Duplication**: Repeated settings - use configuration management

### Refactoring Techniques
- **Extract Method**: Pull duplicated code into separate function
- **Extract Class**: Group related duplicated behavior into class
- **Pull Up Method**: Move common code to superclass
- **Form Template Method**: Define algorithm skeleton, vary steps
- **Replace Conditional with Polymorphism**: Remove repeated switch/if statements
- **Introduce Parameter Object**: Bundle repeated parameter groups

### When to Duplicate
- **Accidental Duplication**: Code looks similar but represents different concepts
- **Premature Abstraction**: Unclear if duplication is pattern or coincidence
- **Performance**: Critical paths where abstraction costs too much
- **Clarity**: When abstraction reduces readability significantly
- **Independence**: When components should evolve independently

## Clean Architecture

### Architectural Layers
- **Domain/Business Layer**: Core business logic, entities, value objects, domain services
- **Application Layer**: Use cases, application services, orchestration
- **Infrastructure Layer**: External concerns - database, web framework, file system
- **Presentation Layer**: UI, controllers, view models, DTOs
- **Dependency Rule**: Dependencies point inward; inner layers don't know about outer layers

### Domain-Driven Design
- **Entities**: Objects with identity and lifecycle
- **Value Objects**: Immutable objects defined by attributes
- **Aggregates**: Cluster of entities/value objects, consistency boundary
- **Repositories**: Abstraction for data access, domain-centric interface
- **Domain Services**: Operations that don't belong to single entity
- **Domain Events**: Represent something that happened in domain

### Separation of Concerns
- **Horizontal Separation**: Technical concerns (UI, business logic, data access)
- **Vertical Separation**: Feature-based modules, bounded contexts
- **Cross-Cutting Concerns**: Logging, security, caching - handled via AOP or middleware
- **Interface Segregation**: Define interfaces per consuming client
- **Modular Design**: High cohesion within modules, low coupling between modules

### Dependency Management
- **Dependency Injection**: Constructor injection, interface-based dependencies
- **Inversion of Control**: Framework controls flow, application provides callbacks
- **Service Locator**: Centralized dependency resolution (use sparingly)
- **Factory Pattern**: Create complex object graphs, encapsulate creation logic
- **Abstract Factory**: Create families of related objects

## Code Review & Quality Assurance

### Code Review Checklist
- **Functionality**: Does it work? Edge cases covered? Error handling present?
- **Readability**: Clear naming? Self-documenting? Appropriate comments?
- **Architecture**: Follows SOLID? Proper separation of concerns? DRY principle?
- **Performance**: Efficient algorithms? No premature optimization? Resource management?
- **Security**: Input validation? SQL injection prevention? Secure data handling?
- **Testing**: Unit tests present? Good coverage? Integration tests where needed?

### Static Analysis
- **Linters**: ESLint, TSLint, Pylint - enforce coding standards
- **Code Complexity**: Cyclomatic complexity metrics, cognitive complexity
- **Code Smells**: SonarQube, Code Climate - detect anti-patterns
- **Type Checking**: TypeScript strict mode, mypy for Python
- **Security Scanning**: Snyk, OWASP dependency check, vulnerability scanning
- **Coverage Tools**: Istanbul, NYC, JaCoCo - measure test coverage

### Technical Debt Management
- **Identification**: Code smells, outdated dependencies, missing tests
- **Documentation**: Track in issue tracker, label as tech debt
- **Prioritization**: Business impact, risk, effort to fix
- **Refactoring**: Incremental improvements, boy scout rule
- **Prevention**: Code reviews, pair programming, TDD, CI/CD

## Testing Best Practices

### Test Pyramid
- **Unit Tests**: Fast, isolated, test single units, majority of tests
- **Integration Tests**: Test component interactions, moderate speed
- **E2E Tests**: Test full user flows, slow, fewer tests
- **Balance**: 70% unit, 20% integration, 10% E2E (approximate)

### Test Quality
- **AAA Pattern**: Arrange, Act, Assert - clear test structure
- **One Assertion Per Test**: Focus on single behavior (guideline, not rule)
- **Test Names**: Descriptive, specify what is tested and expected outcome
- **Test Data**: Use builders, factories, fixtures for consistent test data
- **Isolation**: Tests don't depend on each other, no shared state
- **Fast Tests**: Quick feedback loop, parallelize when possible

### Test-Driven Development (TDD)
- **Red-Green-Refactor**: Write failing test, make it pass, refactor
- **Benefits**: Better design, comprehensive coverage, living documentation
- **Outside-In**: Start with acceptance tests, drill down to unit tests
- **Inside-Out**: Start with unit tests, build up to integration tests
- **Mocking**: Mock external dependencies, verify interactions

## Design Patterns

### Creational Patterns
- **Factory Method**: Define interface for creating objects, let subclasses decide
- **Abstract Factory**: Create families of related objects without specifying concrete classes
- **Builder**: Construct complex objects step by step
- **Singleton**: Ensure class has only one instance (use sparingly, often anti-pattern)
- **Prototype**: Create new objects by cloning existing ones

### Structural Patterns
- **Adapter**: Convert interface of class into another interface clients expect
- **Decorator**: Add responsibilities to objects dynamically
- **Facade**: Provide unified interface to set of interfaces in subsystem
- **Proxy**: Provide surrogate or placeholder for another object
- **Composite**: Compose objects into tree structures, treat uniformly

### Behavioral Patterns
- **Strategy**: Define family of algorithms, make them interchangeable
- **Observer**: Define one-to-many dependency, notify observers of state changes
- **Command**: Encapsulate request as object, parameterize clients with operations
- **Template Method**: Define skeleton of algorithm, let subclasses override steps
- **Chain of Responsibility**: Pass request along chain of handlers

## Anti-Patterns to Avoid

### Code Anti-Patterns
- **God Object**: Class that knows/does too much
- **Spaghetti Code**: Tangled, hard-to-follow control flow
- **Copy-Paste Programming**: Duplicated code everywhere
- **Magic Numbers**: Unexplained literal values in code
- **Shotgun Surgery**: Single change requires modifications in many places
- **Feature Envy**: Method more interested in other class than its own

### Architecture Anti-Patterns
- **Big Ball of Mud**: No discernible architecture, everything coupled
- **Lava Flow**: Dead code left in system, afraid to remove
- **Golden Hammer**: Using same solution for every problem
- **Vendor Lock-in**: Over-dependence on specific technology/vendor
- **Reinventing the Wheel**: Building solutions that already exist

### Process Anti-Patterns
- **Analysis Paralysis**: Over-planning without implementation
- **Premature Optimization**: Optimizing before measuring
- **Not Invented Here**: Rejecting external solutions, building everything
- **Death by Planning**: Excessive documentation, no working software
- **Bike Shedding**: Spending time on trivial decisions

## Refactoring Techniques

### Common Refactorings
- **Extract Method**: Break long methods into smaller ones
- **Rename**: Give better names to variables, functions, classes
- **Move Method/Field**: Relocate to more appropriate class
- **Extract Class**: Split class with multiple responsibilities
- **Inline**: Remove unnecessary indirection
- **Replace Conditional with Polymorphism**: Use inheritance instead of conditionals

### Refactoring Strategy
- **Small Steps**: Make tiny changes, run tests frequently
- **Test Coverage**: Ensure good tests before refactoring
- **Commit Often**: Version control safety net
- **Code Reviews**: Get feedback on refactoring approach
- **Measure Impact**: Profile before/after, ensure improvements
- **Document Decisions**: Record why refactoring was done

### When to Refactor
- **Boy Scout Rule**: Leave code better than you found it
- **Before Adding Features**: Clean up area where new feature will be added
- **During Code Review**: Suggest improvements, pair on refactoring
- **Tech Debt Days**: Dedicated time for refactoring and improvements
- **Red-Green-Refactor**: Refactor after making tests pass (TDD)

## Performance Considerations

### Performance Principles
- **Measure First**: Profile before optimizing, identify real bottlenecks
- **Big-O Complexity**: Understand algorithmic complexity, choose appropriate data structures
- **Caching**: Cache expensive operations, invalidate appropriately
- **Lazy Loading**: Load data only when needed
- **Batch Operations**: Process in bulk when possible, reduce round-trips
- **Asynchronous Processing**: Don't block, use async/await, background jobs

### Code-Level Optimization
- **Avoid Premature Optimization**: Clear code first, optimize hot paths
- **Efficient Data Structures**: Choose appropriate collections, understand trade-offs
- **Minimize Allocations**: Reuse objects, object pooling for hot paths
- **Database Queries**: N+1 problem, eager loading, query optimization
- **Loop Optimization**: Hoist invariant code, consider vectorization
- **Memory Management**: Avoid leaks, dispose resources, use using/with statements

## Documentation Standards

### Code Documentation
- **Self-Documenting Code**: Clear names reduce need for comments
- **Comment Why, Not What**: Explain reasoning, business rules, non-obvious decisions
- **API Documentation**: JSDoc, TSDoc, XML documentation, OpenAPI specs
- **README Files**: Project overview, setup instructions, examples
- **Architecture Documentation**: High-level diagrams, decision records (ADR)
- **Inline Comments**: Complex algorithms, workarounds, gotchas

### Living Documentation
- **Tests as Documentation**: Readable tests demonstrate usage
- **Example Code**: Runnable examples showing common scenarios
- **Changelog**: Track changes, breaking changes, migration guides
- **Decision Records**: Document architectural decisions and rationale
- **Update Regularly**: Keep docs in sync with code, remove outdated docs
