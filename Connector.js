import ElementEventHandler from "./ElementEventHandler"
import ElementConnection from "./ElementConnection"
import config from "./Config"

export default class Connector {
    constructor(stim) {
        this.stim = stim
    }
    connectedAspects = new Set()
    orphans = new Map()
    orphanHosts = new Map()
    get connectAttr() {
        return config.attributePrefix + config.connectAttribute
    }
    get handlerAttr() {
        return config.attributePrefix + config.handlerAttribute
    }
    get scopeAttr() {
        return config.attributePrefix + config.scopeAttribute
    }
    getConnectEls(el = document) {
        return el.querySelectorAll(`[${config.attributePrefix}${config.connectAttribute}]${this.stim.registry.customTagSelector}`)
    }
    getHandlerEls(el = document) {
        return el.querySelectorAll(`[${config.attributePrefix}${config.handlerAttribute}]`)
    }
    connect() {
        this.connectNode(document.documentElement)
        if (config.observeChildList) {
            this.childListObserver.observe(document.documentElement, { childList: true, subtree: true })
        }
        if (config.observeAttributes) {
            this.attributeObserver.observe(document.documentElement, { attributes: true, attributeOldValue: true, attributeFilter: [this.connectAttr, this.handlerAttr], subtree: true })
        }
    }
    disconnect() {
        this.childListObserver.takeRecords()
        this.attributeObserver.takeRecords()
        this.aspectObserver.takeRecords()
        this.childListObserver.disconnect()
        this.attributeObserver.disconnect()
        this.aspectObserver.disconnect()
        this.disconnectNode(document.documentElement)
    }

    childListObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.removedNodes.forEach(node => {
                this.disconnectNode(node)
            })
            mutation.addedNodes.forEach(node => {
                this.connectNode(node)
            })
        })
    })
    attributeObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            const el = mutation.target
            if (mutation.attributeName === this.connectAttr) {
                const oldIds = mutation.oldValue.split(' ') ?? []
                const newIds = el.getAttribute(this.connectAttr).split(' ') ?? []
                const removed = oldIds.filter(id => !newIds.includes(id))
                const added = newIds.filter(id => !oldIds.includes(id))
                this.childTokensRemoved(el, this.filterChildTokens(removed))
                this.hostTokensRemoved(el, this.filterHostTokens(removed))
                this.hostTokensAdded(el, this.filterHostTokens(added), true)
                this.childTokensAdded(el, this.filterChildTokens(added))
                return
            }
            if (mutation.attributeName === this.handlerAttr) {
                this.handlerElRemoved(el)
                this.handlerElAdded(el)
                return
            }
        })
    })
    aspectObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (!mutation.attributeName.startsWith(config.attributePrefix)) return
            const el = mutation.target
            const newVal = el.getAttribute(mutation.attributeName)
            if (mutation.oldValue == newVal) return
            if(mutation.attributeName == this.scopeAttr && el.stim_tm_host) {
                this.setHostScopeAttribute(el)
                return
            }
            el.stim_tm_host?.forEach(aspect => {
                if (mutation.attributeName == `${config.attributePrefix}${aspect.token}:reconnect`) {
                    window.requestAnimationFrame(() => {
                        aspect.disconnected()
                        aspect.connected()
                        el.removeAttribute(`${config.attributePrefix}${aspect.token}:reconnect`)
                    })
                }
                aspect.constructor.attributeSyncer.attributeChanged(aspect, mutation.attributeName, mutation.oldValue, newVal)
            })
        })
    })

    connectNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return
        for (let [selector, callback] of this.stim.registry.selectorRegister.entries()) {
            if (node.matches(selector)) {
                callback(node)
            }
            node.querySelectorAll(selector).forEach(el => callback(el))
        }
        const connectNodes = this.getConnectEls(node)
        if (node.hasAttribute(this.connectAttr) || node.tagName.toLowerCase().startsWith(config.customElementPrefix)) this.hostElAdded(node)
        connectNodes.forEach(child => this.hostElAdded(child))
        if (node.hasAttribute(this.connectAttr)) this.childElAdded(node)
        connectNodes.forEach(child => this.childElAdded(child))
        if (node.hasAttribute(this.handlerAttr)) this.handlerElAdded(node)
        this.getHandlerEls(node).forEach(child => this.handlerElAdded(child))
    }
    disconnectNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return
        if (node.hasAttribute(this.handlerAttr)) this.handlerElRemoved(node)
        this.getHandlerEls(node).forEach(child => this.handlerElRemoved(child))
        const connectNodes = this.getConnectEls(node)
        if (node.hasAttribute(this.connectAttr)) this.childElRemoved(node)
        connectNodes.forEach(child => this.childElRemoved(child))
        if (node.hasAttribute(this.connectAttr)) this.hostElRemoved(node)
        connectNodes.forEach(child => this.hostElRemoved(child))
    }

    hostElAdded(el) {
        let tokens = this.filterHostTokens(el.getAttribute(this.connectAttr)?.split(' ') ?? [])
        if (this.stim.registry.customTags[el.tagName]) {
            tokens.push(this.stim.registry.customTags[el.tagName])
        }
        this.hostTokensAdded(el, tokens)
    }
    hostElRemoved(el) {
        el.stim_tm_host?.forEach(aspect => {
            this.disconnectAspect(aspect)
        })
    }

    childElAdded(el) {
        let tokens = this.filterChildTokens(el.getAttribute(this.connectAttr)?.split(' ') ?? [])
        this.childTokensAdded(el, tokens)
    }
    childElRemoved(el) {
        el.stim_tm_child?.forEach(connection => {
            connection.disconnect()
        })
        this.removeOrphan(el)
    }

    handlerElAdded(el) {
        el.getAttribute(this.handlerAttr).split(' ').forEach(descriptor => {
            new ElementEventHandler(el, descriptor)
        })
        el.stim_tm_handler?.forEach(handler => {
            handler.connect()
        })
    }
    handlerElRemoved(el) {
        el.stim_tm_handler?.forEach(handler => {
            handler.disconnect()
        })
        el.stim_tm_handler = null
    }

    childTokensAdded(el, tokens) {
        tokens?.forEach(token => {
            if (el.stim_tm_child?.get(token)?.connected) {
                el.stim_tm_child.get(token).disconnect()
            }
            const connection = new ElementConnection(el, token)
            if (!connection.aspect && connection.hostId) {
                this.addOrphan(el, connection.hostId, token)
                return
            }
            connection.connect()
        })
    }
    childTokensRemoved(el, tokens) {
        tokens?.forEach(token => {
            const connection = el.stim_tm_child?.get(token)
            connection?.disconnect()
            el.stim_tm_child?.delete(token)
            if (connection.hostId) {
                this.removeOrphan(el, connection.hostId, token)
            }
        })
    }
    
    hostTokensAdded(el, tokens, connectDescendants = false) {
        if (!tokens.length) return
        tokens.forEach(token => {
            this.injectAspect(el, token)
        })
        this.setHostScopeAttribute(el)
        if (el.stim_tm_host && config.observeAspectAttributes) this.aspectObserver.observe(el, {attributes: true, attributeOldValue: true})
        el.stim_tm_host?.forEach(aspect => {
            if (!aspect || aspect.__internal.isConnected) return
            aspect.connected()
            aspect.__internal.isConnected = true
            this.connectedAspects.add(aspect)
            if (el.id) {
                this.orphanHosts.get(el.id)?.forEach((tokens, child) => {
                    this.childTokensAdded(child, [...tokens].filter(id => id.includes(`${aspect.token}.`)))
                })
            }
            if (connectDescendants) {
                el.querySelectorAll(`[${this.connectAttr}*="${aspect.token}."]`).forEach(child => {
                    if (el !== child.closest(`[${this.scopeAttr}*=" ${aspect.token} "]`)) return
                    this.childTokensAdded(child,
                        child.getAttribute(this.connectAttr)
                            .split(' ')
                            .filter(id => id.includes(`${aspect.token}.`))
                    )
                })
            }
        })
    }

    hostTokensRemoved(el, tokens) {
        tokens?.forEach(token => {
            const aspect = el.stim_tm_host?.get(token)
            this.disconnectAspect(aspect)
            el.stim_tm_host?.delete(token)
        })
        this.setHostScopeAttribute(el)
    }

    disconnectAspect(aspect) {
        aspect.__internal.elements.forEach((set, key) => {
            set.forEach(el => {
                el.stim_tm_child.forEach((connection, token) => {
                    if (connection.aspect !== aspect) return
                    if (connection.hostId && connection.el.isConnected) {
                        this.addOrphan(el, connection.hostId, token)
                    }
                    connection.disconnect()
                    el.stim_tm_child.delete(token)
                })
            })
        })
        aspect.disconnected()
        aspect.__internal.isConnected = false
        this.connectedAspects.delete(aspect)
    }

    injectAspect(el, token, attributes = {}) {
        if (!this.stim.registry.aspectRegister.has(token)) {
            console.warn(`Aspect ${token} not found in register, skipping.`)
            return
        }
        if (el.stim_tm_host?.has(token)) return
        Object.entries(this.stim.registry.aspectRegister.get(token).aspects).forEach(([injectToken, injectAttributes]) => {
            this.injectAspect(el, injectToken, injectAttributes)
        })
        new (this.stim.registry.aspectRegister.get(token))(el, this.stim, attributes)
    }

    setHostScopeAttribute(el, oldVal = '') {
        let scopeString = [...el.stim_tm_host.keys()].reduce((acc, token) => acc + `${token} `, ' ') ?? ''
        if (oldVal == scopeString) return
        el.setAttribute(this.scopeAttr, scopeString)
    }

    addOrphan(el, hostId, token) {
        if (!this.orphanHosts.has(hostId)) {
            this.orphanHosts.set(hostId, new Map())
        }
        if (!this.orphanHosts.get(hostId).has(el)) {
            this.orphanHosts.get(hostId).set(el, new Set())
        }
        this.orphanHosts.get(hostId).get(el).add(token)

        if (!this.orphans.has(el)) {
            this.orphans.set(el, new Set())
        }
        this.orphans.get(el).add(hostId)
    }
    removeOrphan(el, hostId = '', token = '') {
        if (!hostId) {
            this.orphans.get(el)?.forEach((hostId) => {
                this.orphanHosts.get(hostId)?.delete(el)
                if (!this.orphanHosts.get(hostId).size) {
                    this.orphanHosts.delete(hostId)
                }
            })
            this.orphans.delete(el)
            return
        }
        if (!this.orphanHosts.has(hostId)) return
        if (token) {
            this.orphanHosts.get(hostId).get(el)?.delete(token)
            if (!this.orphanHosts.get(hostId).get(el).size) {
                this.orphanHosts.get(hostId).delete(el)
                if (!this.orphanHosts.get(hostId).size) {
                    this.orphanHosts.delete(hostId)
                }
            }
        } else {
            this.orphanHosts.get(hostId).delete(el)
            if (!this.orphanHosts.get(hostId).size) {
                this.orphanHosts.delete(hostId)
            }
        }
        this.orphans.get(el)?.delete(hostId)
        if (!this.orphans.get(el).size) {
            this.orphans.delete(el)
        }
    }

    filterHostTokens(tokens) {
        return tokens.filter(id => id && !id.includes('.'))
    }

    filterChildTokens(tokens) {
        return tokens.filter(id => id.includes('.'))
    }
}