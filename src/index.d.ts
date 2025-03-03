type AspectConstructor = { new (...args: ConstructorParameters<typeof Aspect>): Aspect; };

type TokenAspectMap = {
    [key: string]: AspectConstructor
}

type SelectorCallbackMap = {
    [key: string]: Function
}

type AspectDispatchOptions = {
    target?: HTMLElement,
    detail?: any,
    prefix?: string,
    bubbles?: boolean,
    cancelable?: boolean
}

type Config = {
    observeChildList: boolean,
    observeAttributes: boolean,
    observeAspectAttributes: boolean,
    attributePrefix: string,
    connectAttribute: string,
    handlerAttribute: string,
    scopeAttribute: string,
    customElementPrefix: string,
}

declare class Stim {
    config: Config;
    refs: Map<any, any>;
    registerAspect(token: string|TokenAspectMap, constructor?: AspectConstructor): void
    registerCustomElement(token: string|Array<string>): void
    registerSelectorCallback(selector: string|SelectorCallbackMap, callback?: Function): void
    connect(): void
    disconnect(): void
    get aspects(): Set<Aspect>
    getAspects(el: HTMLElement): Map<string, Aspect>
    getAspect(el: HTMLElement, aspectToken: string): Aspect
    connectNode(node: Node): void
    disconnectNode(node: Node): void
}
declare const stim: Stim

declare class Aspect {
    static attributes: object;
    static elements: Array<string>;
    static aspects: Array<string>|object;
    static token: string;
    static registered(token: string, stim: Stim): any;
    static shouldRegister(): boolean;
    get el(): HTMLElement;
    get element(): HTMLElement;
    get stim(): Stim;
    get token(): string;
    constructor(host: HTMLElement, stim: Stim, attributes?: object);
    dispatch(type: string, options?: AspectDispatchOptions): CustomEvent;
    initialized(): any;
    connected(): any;
    disconnected(): any;
    attributeChanged(name: string, oldValue: string, newValue: string): void;
}

export { stim, Aspect }