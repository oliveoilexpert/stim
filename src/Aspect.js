export default class Aspect {
    static attributes = {}
    static elements = []
    static aspects = {}
    static token
    static registered(token, stim) {}
    static shouldRegister() { return true }
    __internal
    get el() { return this.__internal.host }
    get element() { return this.__internal.host }
    get stim() { return this.__internal.stim }
    get token() { return this.constructor.token }
    constructor(host, stim, attributes = {}) {
        this.__internal = {
            host,
            stim,
            elements: new Map(this.constructor.elements.map(key => [key, new Set()]))
        }
        this.constructor.attributeSyncer.initializeAttributes(this, attributes)
        !host.stim_tm_host ? host.stim_tm_host = new Map() : null
        host.stim_tm_host.set(this.token, this)
        this.initialized()
    }

    dispatch(type, {
        target = this.el,
        prefix = this.token,
        detail = {},
        bubbles = false,
        cancelable = false,
        composed = false
    } = {}) {
        type = prefix ? `${prefix}:${type}` : type
        const event = new CustomEvent(type, { detail, bubbles, cancelable, composed })
        target.dispatchEvent(event)
        return event
    }

    initialized()  { }
    connected() { }
    disconnected() { }
    attributeChanged(name, oldValue, newValue) { }
}