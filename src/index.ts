import "reflect-metadata";

// Separated constants for the lifecycle core
const controllerRegistry = new Map<any, { options: any; target: any }>();
const controllerInstances = new Map<any, any>();
const loadOrderMap = new Map<any, number>();
const registeringControllers = new Set<any>();
const moduleRegistry = new Map<any, any[]>();
let started = false;

// Metadata keys constants
const ON_INIT_METADATA_KEY = "onInit";
const ON_START_METADATA_KEY = "onStart";

function AppLifeError(message: string) {
  return new Error(`[AppLife]: ${message}`);
}

function DebugLog(type: "warn" | "log" | "error", ...args: any[]) {
  if (type === "warn") {
    console.warn("[AppLife]: ", ...args);
  } else if (type === "error") {
    console.error("[AppLife]: ", ...args);
  } else {
    console.log("[AppLife]: ", ...args);
  }
}

// Controller decorator with optional loadOrder
export function Controller(options: { loadOrder?: number } = {}) {
  return function (target: any) {
    if (controllerRegistry.has(target)) {
      throw AppLifeError("Controller already registered");
    }
    controllerRegistry.set(target, { options, target });
    loadOrderMap.set(target, options.loadOrder ?? 0);
  };
}

// OnInit lifecycle hook decorator
export function OnInit() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(ON_INIT_METADATA_KEY, propertyKey, target);
  };
}

// OnStart lifecycle hook decorator
export function OnStart() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(ON_START_METADATA_KEY, propertyKey, target);
  };
}

// Module decorator for feature-based controller organization
export function Module(controllers: any[]) {
  return function (target: any) {
    if (moduleRegistry.has(target)) {
      throw AppLifeError("Module already registered");
    }
    moduleRegistry.set(target, controllers);
  };
}

// Helper functions to get lifecycle methods
function getOnInitMethod(controller: any) {
  return Reflect.getMetadata(ON_INIT_METADATA_KEY, controller);
}

function getOnStartMethod(controller: any) {
  return Reflect.getMetadata(ON_START_METADATA_KEY, controller);
}

// Controller registration with dependency resolution
async function registerController(ControllerClass: any): Promise<any> {
  // Return existing instance if already registered
  if (controllerInstances.has(ControllerClass)) {
    return controllerInstances.get(ControllerClass);
  }

  // Detect cyclic dependencies
  if (registeringControllers.has(ControllerClass)) {
    throw AppLifeError("Cyclic dependency detected");
  }
  registeringControllers.add(ControllerClass);

  // Resolve dependencies from constructor parameters
  const paramTypes =
    Reflect.getMetadata("design:paramtypes", ControllerClass) ?? [];
  const dependencies = [];

  for (const dep of paramTypes) {
    if (!controllerRegistry.has(dep)) {
      throw AppLifeError(
        `Dependency ${dep.name} not registered via @Controller`
      );
    }
    const depInstance = await registerController(dep);
    dependencies.push(depInstance);
  }

  // Create instance with dependencies
  let instance;
  try {
    instance = new ControllerClass(...dependencies);
  } catch (error) {
    DebugLog("error", "Error in constructor:", error);
    throw error; // App stops if constructor fails
  }

  // Call OnInit if exists
  const onInitMethod = getOnInitMethod(ControllerClass.prototype);
  if (onInitMethod) {
    try {
      await instance[onInitMethod]();
    } catch (error) {
      DebugLog("error", "Error in OnInit:", error);
      throw error; // App stops if OnInit fails
    }
  }

  controllerInstances.set(ControllerClass, instance);
  registeringControllers.delete(ControllerClass);
  return instance;
}

// Utility to get controller instances after startup
export function Dependency<T>(controllerClass: new (...args: any[]) => T): T {
  if (!started) {
    throw AppLifeError("Use Dependency after AppLife.Start()");
  }
  if (!controllerInstances.has(controllerClass)) {
    throw AppLifeError("Controller not registered or not loaded yet");
  }
  return controllerInstances.get(controllerClass) as T;
}

// The AppLife namespace for lifecycle control
export namespace AppLife {
  // Load modules to ensure all controllers are imported
  export function LoadModules(modules: any[]) {
    for (const module of modules) {
      const controllers = moduleRegistry.get(module);
      if (!controllers) {
        throw AppLifeError(`Module ${module.name} not registered via @Module`);
      }
      // Verify all controllers are registered
      for (const controller of controllers) {
        if (!controllerRegistry.has(controller)) {
          throw AppLifeError(
            `Controller ${controller.name} not registered via @Controller`
          );
        }
      }
    }
  }

  // Start the application lifecycle
  export async function Start() {
    started = true;
    if (controllerRegistry.size === 0) {
      DebugLog("warn", "No controllers registered");
    }
    // Sort controllers by loadOrder
    const sortedControllers = Array.from(controllerRegistry.entries())
      .sort(
        (a, b) => (loadOrderMap.get(a[0]) ?? 0) - (loadOrderMap.get(b[0]) ?? 0)
      )
      .map(([controller]) => controller);

    // Register controllers and call OnInit
    for (const ControllerClass of sortedControllers) {
      await registerController(ControllerClass);
    }

    // Collect and execute OnStart methods in parallel
    const startPromises = [];
    for (const ControllerClass of sortedControllers) {
      const instance = controllerInstances.get(ControllerClass);
      const onStartMethod = getOnStartMethod(ControllerClass.prototype);
      if (onStartMethod) {
        const promise = new Promise<void>((res) => {
          res(instance[onStartMethod]());
        }).catch((error) => {
          DebugLog("warn", "Error in OnStart:", error, instance);
        });
        startPromises.push(promise);
      }
    }

    // Await all promises concurrently
    await Promise.all(startPromises);
  }
}
