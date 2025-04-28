# App Life Package

A lightweight, decorator-based lifecycle and dependency injection framework for TypeScript applications.

## Installation

```bash
# Using npm
npm install app-life-package

# Using Bun
bun add app-life-package
```

## Important Import Warning

When using controllers, always use regular imports rather than type-only imports:

```typescript
import type { SomeController } from "./SomeController"; // BAD: Will cause errors during dependency injection

import { SomeController } from "./SomeController"; // GOOD: Ensures proper controller registration
```

Type-only imports prevent the controller class from being registered properly in the dependency injection system.

## Features

- Decorator-based controller registration
- Controlled lifecycle with initialization and start hooks
- Automatic dependency injection
- Module system for organizing controllers
- Prevention of cyclic dependencies
- Load order control

## Usage

### Basic Example

```typescript
import { Controller, OnInit, OnStart, AppLife } from "app-life-package";

@Controller()
class HelloController {
  @OnInit()
  private init() {
    console.log("HelloController initialized");
  }

  @OnStart()
  private start() {
    console.log("HelloController started");
  }

  sayHello() {
    return "Hello, world!";
  }
}

@Controller()
class AppController {
  constructor(private readonly helloController: HelloController) {}

  @OnStart()
  private start() {
    console.log(this.helloController.sayHello());
  }
}

// Start the application lifecycle
AppLife.Start();
```

### Using Modules

```typescript
import { Controller, Module, AppLife } from "app-life-package";

@Controller()
class UserController {
  getUsers() {
    return ["User1", "User2"];
  }
}

@Controller()
class ProductController {
  getProducts() {
    return ["Product1", "Product2"];
  }
}

@Module([UserController, ProductController])
class FeatureModule {}

// To ensure all controllers are imported
AppLife.LoadModules([FeatureModule]);
AppLife.Start();
```

### Controlling Load Order

```typescript
@Controller({ loadOrder: 1 })
class FirstController {}

@Controller({ loadOrder: 2 })
class SecondController {}
```

### Using the Dependency Utility

```typescript
import { Controller, OnStart, Dependency, AppLife } from "app-life-package";

@Controller()
class ServiceController {
  getData() {
    return "Service Data";
  }
}

@Controller()
class ConsumerController {
  @OnStart()
  private start() {
    // Get controller reference after initialization
    const service = Dependency(ServiceController);
    console.log(service.getData());
  }
}

AppLife.Start();
```

## API Reference

### Decorators

#### `@Controller(options?: { loadOrder?: number })`

Registers a class as a controller in the application lifecycle.

- `loadOrder`: Optional number that determines initialization order (lower values initialize first)

#### `@OnInit()`

Marks a method to be called during the initialization phase, before dependency injection.

#### `@OnStart()`

Marks a method to be called after all controllers are initialized and injected.

#### `@Module(controllers: any[])`

Registers a class as a module containing a list of controllers.

### Functions

#### `Dependency<T>(controllerClass: new (...args: any) => T): T`

Gets an instance of a registered controller after initialization.

- Should primarily be used within `OnStart` methods or after `AppLife.Start()`
- Throws error if controller is not registered or not loaded yet

### AppLife Namespace

#### `AppLife.LoadModules(modules: any[])`

Ensures that all controllers in the provided modules are imported.

#### `AppLife.Start()`

Starts the application lifecycle:

1. Initializes all controllers in order of their `loadOrder`
2. Resolves dependencies between controllers
3. Calls `OnInit` methods
4. Calls all `OnStart` methods in parallel

## Important Notes

- If a controller fails in constructor - app stops
- If a controller fails in OnInit - app stops
- If a controller fails in OnStart - it logs a warning but the app continues running
- Cyclic dependencies are detected and prevented
