export default class Aspect {
    static attributes = {}
    static elements = []
    static aspects = {}
    static registered(token, nexus) {}
    static shouldRegister() { return true }

    __internal
    get el() { return this.__internal.host }
    get element() { return this.__internal.host }
    get nexus() { return this.__internal.nexus }
    get token() { return this.constructor.token }
    constructor(host, nexus, attributes = {}) {
        this.__internal = {
            host,
            nexus,
            elements: new Map(this.constructor.elements.map(key => [key, new Set()]))
        }
        this.constructor.attributeSyncer.initializeAttributes(this, attributes)
        !host.nxs_tm_host ? host.nxs_tm_host = new Map() : null
        host.nxs_tm_host.set(this.token, this)
        this.initialized()
    }

    dispatch(type, {
        target = this.el,
        detail = {},
        prefix = this.token,
        bubbles = true,
        cancelable = true
    } = {}) {
        type = prefix ? `${prefix}:${type}` : type
        const event = new CustomEvent(type, { detail, bubbles, cancelable })
        target.dispatchEvent(event)
        return event
    }

    initialized()  { return this }
    connected() { return this }
    disconnected() { return this }
    attributeChanged(name, oldValue, newValue) { }
}