import { ClientSideRowModelModule, ModuleRegistry } from 'ag-grid-community'

let registered = false

export function registerGridModules(): void {
  if (registered) return
  ModuleRegistry.registerModules([ClientSideRowModelModule])
  registered = true
}
