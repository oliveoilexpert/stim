import Registry from "./Registry"
import Connector from "./Connector"
import config from "./Config"

class Stim {
    config = config
    registry = new Registry()
    connector = new Connector(this)
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
        return el?.nxs_tm_host
    }
    getAspect(el, aspectName) {
        return el?.nxs_tm_host?.get(aspectName)
    }
}

export default new Stim()