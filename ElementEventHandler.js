import { camelCase, kebabCase } from "./Utils"
import config from "./Config"

export default class ElementEventHandler {
    /**
     * @type {HTMLElement}
     */
    el = null
    token = null
    event = null
    listener = null
    listenerOptions = {}

    constructor(el, descriptor) {
        this.el = el
        descriptor = this.completeDescriptor(el, descriptor)
        const [
            eventDescriptor,
            token,
            id
        ] = descriptor.split(/->|#/);

        let event = eventDescriptor
        let optionDescriptor = ''
        if (eventDescriptor.includes('[')) {
            [event, optionDescriptor] = eventDescriptor.replace(']', '').split('[')
            optionDescriptor.split(' ').forEach(option => {
                let value = true
                if (option.startsWith('!')) {
                    option = option.slice(1)
                    value = false
                }
                this.listenerOptions[option] = value
            })
        }
        let [
            aspectToken,
            aspectMethod
        ] = token.split('.')
        const attr = `${config.attributePrefix}${config.connectAttribute}`

        this.token = kebabCase(`${aspectToken}.${aspectMethod}`)
        aspectMethod = camelCase(aspectMethod)
        this.event = event.split('.')[0]
        if (el.stim_tm_handler?.get(this.token)) {
            console.log(`Handler ${this.token} already connected to ${el.id}`)
            return
        }

        const triggerGuard = this.getTriggerGuard(event)

        this.listener = e => {
            const aspectEl = id
                ? document.getElementById(id)
                : el.closest(`[${attr}="${aspectToken}"], [${attr}^="${aspectToken} "], [${attr}$=" ${aspectToken}"], [${attr}*=" ${aspectToken} "]`);

            const aspect = aspectEl?.stim_tm_host?.get(aspectToken)
            if (triggerGuard(e) || !aspect) return
            //if (!aspect.__connected) return
            if (typeof aspect[aspectMethod] !== 'function') return
            if (this.listenerOptions['prevent']) {
                e.preventDefault()
            }
            if (this.listenerOptions['stop']) {
                e.stopPropagation()
            }

            const params = el.hasAttribute(`${config.attributePrefix}${this.token}`) ? this.typecast(el.getAttribute(`${config.attributePrefix}${this.token}`)) : {}
            for (const attr of el.attributes) {
                if (attr.name.startsWith(`${config.attributePrefix}${this.token}.`)) {
                    const attrKey = camelCase(attr.name.replace(`${config.attributePrefix}${this.token}.`, ''))
                    params[attrKey] = this.typecast(attr.value)
                }
            }
            e.handlerTarget = el

            aspect[aspectMethod](params, e)
        }

        !el.stim_tm_handler ? el.stim_tm_handler = new Map() : null
        el.stim_tm_handler.set(this.token, this)
    }

    completeDescriptor(el, descriptor) {
        if (descriptor.includes('->')) {
            return descriptor
        }
        if (el.tagName === 'FORM') {
            descriptor = `submit->${descriptor}`
        } else if (el.tagName === 'INPUT' && el.type !== 'submit') {
            descriptor = `input->${descriptor}`
        } else if (el.tagName === 'TEXTAREA') {
            descriptor = `input->${descriptor}`
        } else if (el.tagName === 'SELECT') {
            descriptor = `change->${descriptor}`
        } else if (el.tagName === 'DETAILS') {
            descriptor = `toggle->${descriptor}`
        } else {
            descriptor = `click->${descriptor}`
        }
        return descriptor
    }

    getTriggerGuard(eventDescriptor) {
        if (eventDescriptor.startsWith('keydown') || eventDescriptor.startsWith('keyup')) {
            let key, modifier
            if (eventDescriptor.includes('+')) {
                key = eventDescriptor.split('+')[1]?.toLowerCase()
                modifier = eventDescriptor.split('.')[1].split('+')[0]?.toLowerCase()
            } else {
                key = eventDescriptor.split('.')[1]?.toLowerCase()
            }
            return e => {
                if (key && e.key.toLowerCase() !== key) return true
                if (modifier && !e[`${modifier}Key`]) return true
                return false
            }
        }
        return e => false
    }

    typecast(val) {
        try { return JSON.parse(val) } catch { return val }
    }

    connect() {
        this.el.addEventListener(this.event, this.listener, this.listenerOptions)
    }

    disconnect() {
        this.el.removeEventListener(this.event, this.listener, this.listenerOptions)
    }
}