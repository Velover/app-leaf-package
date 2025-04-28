@Controller({
loadOrder: 1, //optional
})
class SomeController {
constructor(private readonly \_someOtherController: SomeOtherController) {}

//executes before injection
@OnInit()
private Init() {}

//executes for each controller after injections in async
@OnStart()
private Start() {}
}

//main file

//starts everything and prevents the app stopping
AppLeaf.Start();

````

**IMPORTANT NOTES**

- If controller fails in constructor - app stops
- If controller fails in OnInit - app stops
- If controller fails in OnStart - warn in console and app still works
- prevent cyclic dependency injection

Create a lifecycle core. Syntax:

```ts
@Controller({
loadOrder: 1, //optional
})
class SomeController {
constructor(private readonly _someOtherController) {}

//executes before injection
@OnInit()
private Init() {}

//executes for each controller after injections in async
@OnStart()
private Start() {}
}

//main file

//to ensure everything is imported
AppLeaf.LoadModules([Feature1Module, Feature2Module]);
//starts the lifecycle
AppLeaf.Start();
````

**IMPORTANT NOTES**

- If controller fails in constructor - app stops
- If controller fails in OnInit - app stops
- If controller fails in OnStart - warn in console and app still works

Create import resolution to ensure that all controllers are up and running. (This will be used for apps, normal projects, but not the backend).

Syntax

```ts
@Module([Controller1, Controller2, Controller3])
class FeatureModule {}
```

It's just to ensure that all controllers are imported and running. Since the project has feature-based separation, it will allow each feature to decide what controllers to use.

Use reflect to detect the dependency injection, error if the controller is not registered via @Controller({})

**other possibilities**

```ts
//can be used to get the controller by generic instead of direct import (will allow to prevent cyclic dependencies)
//should be used only after AppLeaf.Start(), otherwise errors
const someController = Dependency(SomeController);
```

**API OF `Dependency`**
Dependency should be available before OnInit are called, but it doesnt guarantee that all Controllers are loaded by that time (will error if the controller is not loaded, should be resolved with loadOrder manually). Preffered usage place in OnStart method of the Controller.

Ensure that it calls OnInit before injection.
Ensure that you cannot register controllers twice (Skip if already registered).

Controller should be registered only after calling OnInit registered method on the controller. If dependency injection is happening, it should register the injected Controllers first before passing them to the constructor of the other Controller. The `Dependency` utility should error if the controller is not registered (So preffered place to use the Dependency is in the OnStart, otherwise the user should take care of putting loadOrder properly).

OnStart methods should be called ONLY after the injection is comprete and ALL controllers have their OnInit method called.

OnInit - is optional
OnStart - is optional

**Flow**

1. Collect all controllers and sort them by the loadout order
2. Register controllers one by one
3. If controller has dependency - pre-register the dependencies first (prevent cyclic dependencies)
4. Call OnInit registered method before injecting to the other controller

**NOTE**: `Depencency` doesnt register the controllers, but tries to get the registered instance of controller
