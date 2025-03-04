import Registry from "./Registry"
import Connector from "./Connector"
import config from "./Config"

class Stim {
    config = config
    registry = new Registry()
    connector = new Connector(this)
    refs = new Map()
    registerAspect(token, constructor) {
        this.registry.addAspect(token, constructor, this)
    }
    registerCustomElement(token) {
        this.registry.addCustomElement(token)
    }
    registerSelectorCallback(selector, callback) {
        this.registry.addSelectorCallback(selector, callback)
    }
    connect() {
        this.connector.connect()
    }
    disconnect() {
        this.connector.disconnect()
    }
    get aspects() {
        return this.connector.connectedAspects
    }
    getAspects(el) {
        return el?.stim_tm_host
    }
    getAspect(el, aspectToken) {
        return el?.stim_tm_host?.get(aspectToken)
    }
    connectNode(node) {
        this.connector.connectNode(node)
    }
    disconnectNode(node) {
        this.connector.disconnectNode(node)
    }
}

export default new Stim()