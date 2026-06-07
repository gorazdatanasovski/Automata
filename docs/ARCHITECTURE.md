# Automata Architecture

Automata is designed as a modular, highly concurrent engine.

## Core Subsystems
1. **Orchestrator**: The central brain. Manages the execution lifecycle, handles rate limiting, and dispatches tasks to specific platform adapters.
2. **Stealth Browser**: A heavily customized Playwright instance wrapper designed to evade bot detection by randomizing fingerprinting, mimicking human mouse movements, and masking automation signals.
3. **Parsers**: Deterministic state-machine parsers that analyze the DOM, identify form inputs, map semantic relationships, and extract structural metadata.
4. **Platform Adapters**: Specialized modules designed to interface with distinct backend platforms (e.g., Workday, Greenhouse, Lever).
