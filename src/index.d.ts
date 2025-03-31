type ControllerProps = Record<string, string|number|boolean|object>
type ControllerConstructor = { new (...args: ConstructorParameters<typeof Controller>): Controller }
type IdentifierToControllerConstructorDictionary = Record<string, ControllerConstructor>
type SelectorToCallbackDictionary = Record<string, (target: HTMLElement) => void>
declare class ControllerTarget {
    constructor(el: HTMLElement, descriptor: string)
}
declare class ControllerAction {
    constructor(el: HTMLElement, descriptor: string)
}
declare class PropSyncer {
    constructor(props: ControllerProps, token: string)
}
type DispatchOptions = {
    target?: HTMLElement,
    prefix?: string,
    detail?: object,
    bubbles?: boolean,
    cancelable?: boolean,
    composed?: boolean,
}
type Config = {
    observeChildList: boolean,
    observeAttributes: boolean,
    observeControllerAttributes: boolean,
    attributePrefix: string,
    controllerAttribute: string,
    targetAttribute: string,
    actionAttribute: string,
}
declare class Stim {
    get config(): Config
    get controllerRegister(): IdentifierToControllerConstructorDictionary
    get selectorRegister(): SelectorToCallbackDictionary
    get syncers(): Record<string, PropSyncer>
    get controllers(): WeakMap<HTMLElement, Record<string, Controller>>
    get targets(): WeakMap<HTMLElement, Record<string, ControllerTarget>>
    get actions(): WeakMap<HTMLElement, Record<string, ControllerAction>>
    connect(): void
    disconnect(): void
    connectElement(element: HTMLElement): void
    disconnectElement(element: HTMLElement): void
    clearMutationQueue(): void
    getController(element: HTMLElement, identifier: string): Controller|undefined
    registerController(identifier: string|IdentifierToControllerConstructorDictionary, controllerClass?: ControllerConstructor): void
    registerSelectorCallback(selector: string|SelectorToCallbackDictionary, callback?: (target: HTMLElement) => void): void
}
declare const stim: Stim
declare class Controller {
    static token: string
    static props: ControllerProps
    static targets: Array<string>
    static injects: Record<string, ControllerProps>
    static registered(identifier: string, stim: Stim): void
    get identifier(): string
    get element(): HTMLElement
    get stim(): Stim
    constructor(element: HTMLElement, propToken: string)
    initialized(): void
    connected(): void
    disconnected(): void
    attributeChanged(name: string, oldValue: string, newValue: string): void
    dispatch(type: string, options?: DispatchOptions): CustomEvent
}

export { stim, Controller }