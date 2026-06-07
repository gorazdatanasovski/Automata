# API Reference

*Note: This is an internal API reference for adapter development.*

## `IEngine`
The root interface for the Automata execution loop.
- `execute(targets: TargetList): Promise<Result>`

## `IAdapter`
Base interface for all platform adapters.
- `initialize(context: BrowserContext): Promise<void>`
- `process(url: string, payload: ApplicationPayload): Promise<boolean>`
