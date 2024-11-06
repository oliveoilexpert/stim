import {camelCase, kebabCase} from "./Utils.js";
import AspectAttributeSyncer from "./AspectAttributeSyncer.js";
import config from "./Config"


export default class Registry {
    aspectRegister = new Map()
    selectorRegister = new Map()
    customTagSelector = ''
    customTags = []
    addAspect(token, constructor, stim) {
        if (typeof token == 'object') {
            Object.entries(token).forEach(([key, value]) => {
                this.addAspect(kebabCase(key), value)
            })
            return
        }
        if (!constructor.shouldRegister()) return
        this.processAspect(token, constructor)
        this.aspectRegister.set(token, constructor)
        constructor.registered(token, stim)
    }
    addCustomElement(token) {
        if (Array.isArray(token)) {
            token.forEach(value => {
                this.addCustomElement(value)
            })
            return
        }
        if (!this.aspectRegister.has(token)) {
            console.warn(`Aspect ${token} not found in register, skipping custom element registration.`)
            return
        }
        this.customTagSelector += `, ${config.customElementPrefix}${token}`
        this.customTags[(config.customElementPrefix + token).toUpperCase()] = token
        customElements.define(config.customElementPrefix + token, class extends HTMLElement {
            constructor() {
                super()
            }
        })
    }
    addSelectorCallback(selector, callback) {
        if (typeof selector == 'object') {
            Object.entries(selector).forEach(([key, value]) => {
                this.addSelectorCallback(key, value)
            })
            return
        }
        this.selectorRegister.set(selector, callback)
    }
    processAspect(token, constructor) {
        constructor.token = token
        constructor.attributeSyncer = new AspectAttributeSyncer(token, constructor, constructor.attributes)
        const convertToObj = arr => {
            return arr.reduce((result, key) => {
                if (typeof key !== 'string') {
                    console.warn(`Invalid token ${key} on ${token}, skipping.`)
                    return result
                }
                result[key] = {}
                return result
            }, {})
        }
        if (Array.isArray(constructor.aspects)) {
            constructor.aspects = convertToObj(constructor.aspects)
        }

        for (let attrKey of Object.keys(constructor.attributes)) {
            Object.defineProperty(constructor.prototype, attrKey, {
                get() {
                    return this[`#${attrKey}`]
                },
                set(val) {
                    this.constructor.attributeSyncer.setAttribute(this, attrKey, val, true)
                }
            })
        }
        for (let elementName of constructor.elements) {
            Object.defineProperty(constructor.prototype, `${elementName}Elements`, {
                get() {
                    return this.__internal.elements.get(elementName)
                }
            })
            Object.defineProperty(constructor.prototype, `${elementName}Element`, {
                get() {
                    return this.__internal.elements.get(elementName).values()?.next()?.value
                },
            })
        }
        for (let injectToken of Object.keys(constructor.aspects)) {
            Object.defineProperty(constructor.prototype, `${camelCase(injectToken)}Aspect`, {
                get() {
                    return this.el.stim_tm_host.get(injectToken)
                },
            })
        }
    }
}