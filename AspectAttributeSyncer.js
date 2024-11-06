import { kebabCase } from "./Utils"
import config from "./Config"

export default class AspectAttributeSyncer {
    token = null
    attributes = {}
    attrKeyMap = {}
    convertKey = attrKey => {
        return `${config.attributePrefix}${this.token}.${kebabCase(attrKey)}`
    }
    constructor(token, constructor, attributes = {}) {
        this.token = token
        this.attributes = attributes
        Object.keys(constructor.attributes).forEach(attrKey => {
            const dataAttr = this.convertKey(attrKey)
            this.attrKeyMap[attrKey] = dataAttr
            this.attrKeyMap[dataAttr] = attrKey
        })
    }

    write(attrKey, val) {
        if (typeof this.attributes[attrKey] == 'string') {
            return val
        }
        if (typeof this.attributes[attrKey] == 'boolean') {
            return val ? '' : 'false'
        }
        try { return JSON.stringify(val) } catch { return val }
    }
    read(attrKey, val) {
        if (typeof this.attributes[attrKey] == 'string') {
            return val
        }
        if (typeof this.attributes[attrKey] == 'boolean') {
            return val !== '0' && val !== 'false'
        }
        try { return JSON.parse(val) } catch { return val }
    }

    initializeAttributes(aspect, argAttributes = {}) {
        const attrAttributes = JSON.parse(aspect.el.getAttribute(config.attributePrefix + this.token) || '{}')
        for (let attrKey in this.attributes) {
            const dataAttr = this.attrKeyMap[attrKey]
            if (aspect.el.hasAttribute(dataAttr)) {
                this.setAttribute(aspect, attrKey, this.read(attrKey, aspect.el.getAttribute(dataAttr)), false)
            } else if (Object.prototype.hasOwnProperty.call(attrAttributes, attrKey)) {
                this.setAttribute(aspect, attrKey, attrAttributes[attrKey], true)
            } else if (Object.prototype.hasOwnProperty.call(argAttributes, attrKey)) {
                this.setAttribute(aspect, attrKey, argAttributes[attrKey], true)
            } else {
                this.setAttribute(aspect, attrKey, this.attributes[attrKey], false)
            }
        }
        aspect.el.removeAttribute(config.attributePrefix + this.token)
    }

    setAttribute(aspect, attrKey, val, sync = true) {
        if (val === aspect[`#${attrKey}`]) return
        const oldVal = aspect[`#${attrKey}`]
        aspect[`#${attrKey}`] = val
        if (typeof aspect[`${attrKey}Changed`] === 'function') {
            aspect[`${attrKey}Changed`](oldVal, val)
        }
        if (!sync) return
        const writeVal = this.write(attrKey, val)
        const writeName = this.attrKeyMap[attrKey]
        if (
            typeof this.attributes[attrKey] === 'object'
            && writeVal === this.write(attrKey, this.attributes[attrKey])
        ) {
            aspect.el.removeAttribute(writeName)
            return
        }
        if (val === this.attributes[attrKey]) {
            aspect.el.removeAttribute(writeName)
            return
        }
        aspect.el.setAttribute(writeName, writeVal)
    }

    attributeChanged(aspect, name, oldVal, newVal) {
        const attrKey = this.attrKeyMap[name]
        if (!attrKey) {
            aspect.attributeChanged(name, oldVal, newVal)
            return
        }
        let newReadVal
        if (newVal === null || newVal === undefined) {
            newReadVal = this.attributes[attrKey]
        } else {
            newReadVal = this.read(attrKey, newVal)
        }
        this.setAttribute(aspect, attrKey, newReadVal, false)
    }
}