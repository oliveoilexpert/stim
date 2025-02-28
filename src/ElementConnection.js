import { camelCase } from "./Utils";
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
        this.aspect = this.aspectEl?.stim_tm_host?.get(aspectToken)
        !el.stim_tm_child ? el.stim_tm_child = new Map() : null
        el.stim_tm_child.set(descriptor, this)
    }

    connect() {
        if (this.connected || !this.aspect) return
        this.aspect.__internal.elements.get(this.type)?.add(this.el)
        let camelCasedType = camelCase(this.type)
        if (typeof this.aspect[`${camelCasedType}ElementConnected`] == 'function') {
            this.aspect[`${camelCasedType}ElementConnected`](this.el)
        }
        this.connected = true
    }

    disconnect() {
        if (!this.connected || !this.aspect) return
        this.aspect.__internal.elements.get(this.type)?.delete(this.el)
        let camelCasedType = camelCase(this.type)
        if (typeof this.aspect[`${camelCasedType}ElementDisconnected`] == 'function') {
            this.aspect[`${camelCasedType}ElementDisconnected`](this.el)
        }
        this.connected = false
    }
}