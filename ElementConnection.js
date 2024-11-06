import config from "./Config"

export default class ElementConnection {
    connected = false
    constructor(el, descriptor) {
        this.el = el
        const [
            aspectToken,
            type,
            hostId
        ] = descriptor.split(/[.#]/)
        if (!type || !aspectToken) return
        this.type = type
        this.hostId = hostId
        this.aspectToken = aspectToken
        this.aspectEl = hostId
            ? document.getElementById(hostId)
            : el.closest(`[${config.attributePrefix}${config.scopeAttribute}*=" ${aspectToken} "]`)
        this.aspect = this.aspectEl?.nxs_tm_host?.get(aspectToken)
        !el.nxs_tm_child ? el.nxs_tm_child = new Map() : null
        el.nxs_tm_child.set(descriptor, this)
    }

    connect() {
        if (this.connected || !this.aspect) return
        this.aspect.__internal.elements.get(this.type)?.add(this.el)
        if (typeof this.aspect[`${this.type}ElementConnected`] == 'function') {
            this.aspect[`${this.type}ElementConnected`](this.el)
        }
        this.connected = true
    }

    disconnect() {
        if (!this.connected || !this.aspect) return
        this.aspect.__internal.elements.get(this.type)?.delete(this.el)
        if (typeof this.aspect[`${this.type}ElementDisconnected`] == 'function') {
            this.aspect[`${this.type}ElementDisconnected`](this.el)
        }
        this.connected = false
    }
}