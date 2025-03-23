const kebabCase = str => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())
const camelCase = str => str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const config = {
	observeChildList: true,
	observeAttributes: true,
	observeAspectAttributes: true,
	attributePrefix: 'data-',
	traitAttribute: 'trait',
	refAttribute: 'ref',
	handlerAttribute: 'handler',
	scopeAttribute: 'scope',
	customElementSuffix: 'element',
}

class PropSyncer {
	props = {}
	keys = {}
	token = ''
	get propsAttr() {
		return `${config.attributePrefix}${this.token}`
	}
	constructor(props = {}, token = '') {
		this.props = props
		this.token = token
		for (const key in this.props) {
			const attr = kebabCase(key)
			this.keys[key] = attr
			this.keys[attr] = key
		}
	}
	write(defaultVal, val) {
		if (typeof defaultVal == 'string') return val
		if (typeof defaultVal == 'boolean') return val ? '' : 'false'
		try { return JSON.stringify(val) } catch { return val }
	}
	read(defaultVal, val) {
		if (typeof defaultVal == 'string') return val
		if (typeof defaultVal == 'boolean') return val !== '0' && val !== 'false'
		try { return JSON.parse(val) } catch { return val }
	}
	init(object, element) {
		const attrProps = JSON.parse(element.getAttribute(this.propsAttr) || '{}')
		for (const key in this.props) {
			const attr = this.keys[key]
			const defaultVal = this.props[key]
			if (element.hasAttribute(attr)) {
				this.set(object, element, key, this.read(defaultVal, element.getAttribute(attr)), false)
			} else if (key in attrProps) {
				this.set(object, element, key, attrProps[key], true)
			} else {
				this.set(object, element, key, defaultVal, false)
			}
		}
		element.removeAttribute(this.propsAttr)
	}
	set(object, element, key, val, sync = true) {
		if (val === object[`#${key}`]) return
		const oldVal = object[`#${key}`]
		object[`#${key}`] = val
		if (typeof object[`${key}PropChanged`] === 'function') {
			object[`${key}PropChanged`](oldVal, val)
		}
		if (!sync) return
		const defaultVal = this.props[key]
		const writeVal = this.write(defaultVal, val)
		const attr = this.keys[key]
		if (val === defaultVal || (typeof defaultVal === 'object' && writeVal === this.write(defaultVal, defaultVal))) {
			element.removeAttribute(attr)
			return
		}
		element.setAttribute(attr, writeVal)
	}
	attributeChanged(object, element, name, oldVal, newVal) {
		if (name === config.propsAttr) {
			this.init(object, element)
			return
		}
		const key = this.keys[name]
		if (!key) {
			object.attributeChanged(name, oldVal, newVal)
			return
		}
		const defaultVal = this.props[key]
		const newReadVal = (newVal === null || newVal === undefined) ? defaultVal : this.read(defaultVal, newVal)
		this.set(object, element, key, newReadVal, false)
	}
}

class Stim {
	propSyncers = {}
	orphans = new Map([['', new Set()]])
	traits = new WeakMap()
	refs = new WeakMap()
	handlers = new WeakMap()
	traitRegister = {}
	selectorRegister = {}
	observers = {
		childList: new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.removedNodes.forEach(node => {
					this.disconnectElement(node)
				})
				mutation.addedNodes.forEach(node => {
					this.connectElement(node)
				})
			})
		}),
		attribute: new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				const el = mutation.target
				if (mutation.attributeName === this.traitAttr) {
					this.updateTraits(el, el.getAttribute(this.traitAttr))
					return
				}
				if (mutation.attributeName === this.refAttr) {
					this.updateRefs(el, el.getAttribute(this.refAttr))
					return
				}
				if (mutation.attributeName === this.handlerAttr) {
					this.updateHandlers(el, el.getAttribute(this.handlerAttr))
				}
			})
		}),
		trait: new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (!mutation.attributeName.startsWith(config.attributePrefix)) return
				const el = mutation.target
				const newVal = el.getAttribute(mutation.attributeName)
				if (mutation.oldValue == newVal) return
				this.traits.get(el)?.forEach(trait => {
					this.propSyncers[trait.token].attributeChanged(trait, el, mutation.attributeName, mutation.oldValue, newVal)
				})
			})
		})
	}
	get traitAttr() {
		return config.attributePrefix + config.traitAttribute
	}
	get refAttr() {
		return config.attributePrefix + config.refAttribute
	}
	get handlerAttr() {
		return config.attributePrefix + config.handlerAttribute
	}
	connect() {
		this.connectElement(document.documentElement)
		if (config.observeChildList) {
			this.observers.childList.observe(document.documentElement, { childList: true, subtree: true })
		}
		if (config.observeAttributes) {
			this.observers.attribute.observe(document.documentElement, { attributes: true, attributeOldValue: true, attributeFilter: [this.traitAttr, this.refAttr, this.handlerAttr], subtree: true })
		}
	}
	disconnect() {
		for (const observer of this.observers) {
			observer.takeRecords()
			observer.disconnect()
		}
		this.disconnectElement(document.documentElement)
	}
	connectElement(el) {
		if (el.nodeType !== Node.ELEMENT_NODE) return
		for (let [selector, callback] of this.selectorRegister?.entries()) {
			if (el.matches(selector)) {
				callback(el)
			}
			el.querySelectorAll(selector).forEach(el => callback(el))
		}
		if (el.hasAttribute(this.traitAttr)) this.updateTraits(el, el.getAttribute(this.traitAttr))
		el.querySelectorAll(`[${this.traitAttr}]`).forEach(target => this.updateTraits(target, target.getAttribute(this.traitAttr)))
		if (el.hasAttribute(this.refAttr)) this.updateRefs(el, el.getAttribute(this.refAttr))
		el.querySelectorAll(`[${this.refAttr}]`).forEach(target => this.updateRefs(target, target.getAttribute(this.refAttr)))
		if (el.hasAttribute(this.handlerAttr)) this.updateHandlers(el, el.getAttribute(this.handlerAttr))
		el.querySelectorAll(`[${this.handlerAttr}]`).forEach(target => this.updateHandlers(target, target.getAttribute(this.handlerAttr)))
	}
	disconnectElement(el) {
		if (el.nodeType !== Node.ELEMENT_NODE) return
		if (el.hasAttribute(this.traitAttr)) this.updateTraits(el)
		el.querySelectorAll(`[${this.traitAttr}]`).forEach(target => this.updateTraits(target))
		if (el.hasAttribute(this.refAttr)) this.updateRefs(el)
		el.querySelectorAll(`[${this.refAttr}]`).forEach(target => this.updateRefs(target))
		if (el.hasAttribute(this.handlerAttr)) this.updateHandlers(el)
		el.querySelectorAll(`[${this.handlerAttr}]`).forEach(target => this.updateHandlers(target))
	}
	updateTraits(el, tokens = '') {
		const traits = this.traits.get(el) ?? {}
		const tokenSet = new Set(tokens.split(' '))
		for (const token in traits) {
			if (!tokenSet.has(token)) {
				this.disconnectTrait(traits[token])
			}
		}
		for (const token of tokenSet) {
			if (!traits[token]) {
				this.connectTrait(el, new this.traitRegister[token](el))
			}
		}
	}
	updateRefs(el, descriptors = '') {
		const refs = this.refs.get(el) ?? {}
		const descriptorSet = new Set(descriptors.split(' '))
		for (const descriptor in refs) {
			if (!descriptorSet.has(descriptor)) {
				this.disconnectRef(refs[descriptor])
			}
		}
		for (const descriptor of descriptorSet) {
			if (!refs[descriptor]) {
				this.connectRef(new TraitRef(el, descriptor))
			}
		}
	}
	updateHandlers(el, descriptors = '') {
		const handlers = this.handlers.get(el) ?? {}
		const descriptorSet = new Set(descriptors.split(' '))
		for (const descriptor in handlers) {
			if (!descriptorSet.has(descriptor)) {
				this.disconnectHandler(handlers[descriptor])
			}
		}
		for (const descriptor of descriptorSet) {
			if (!handlers[descriptor]) {
				this.connectHandler(new TraitHandler(el, descriptor))
			}
		}
	}
	connectTrait(el, trait) {
		if (!this.traits.get(el)) this.traits.set(el, {})
		this.traits.get(el)[trait.token] = trait
		this.observers.trait.observe(el, {attributes: true, attributeOldValue: true})
		trait.connected()
		if (el.id && this.orphans.has(el.id)) {
			for (const ref of this.orphans.get(el.id)) {
				if (ref.token == trait.token) {
					this.connectRef(ref)
				}
			}
		}
		for (const ref of this.orphans.get('')) {
			if (el.contains(ref) && ref.token == trait.token) {
				this.connectRef(ref)
			}
		}
	}
	disconnectTrait(trait) {
		trait.disconnected()
		for (const type in trait.$refs) {
			for (const ref of trait.$refs[type]) {
				this.disconnectRef(ref, true)
			}
		}
		delete this.traits.get(trait.$el)?.[trait.token]
	}
	connectRef(ref) {
		if (ref.trait) {
			return
		}
		const target = ref.targetId ? document.getElementById(ref.targetId) : ref.el.closest(`[${config.traitAttr}]`)
		ref.trait = this.traits.get(target)?.[ref.token]
		if (!ref.trait) {
			ref.trait = null
			this.addOrphan(ref)
			return
		}
		this.removeOrphan(ref)
		ref.trait.$refs[ref.type].add(ref.el)
		if (!this.refs.get(ref.el)) this.refs.set(ref.el, {})
		this.refs.get(ref.el)[ref.descriptor] = ref
		const callbackName = `${camelCase(ref.type)}RefConnected`
		if (typeof ref.trait[callbackName] == 'function') {
			ref.trait[callbackName](ref.el)
		}
	}
	disconnectRef(ref, addOrphan = false) {
		if (!addOrphan) this.removeOrphan(ref)
		if (!ref.trait) {
			return
		}
		if (addOrphan) this.addOrphan(ref)
		ref.trait.$refs[ref.type].delete(ref.el)
		delete this.refs.get(ref.el)[ref.descriptor]
		const callbackName = `${camelCase(ref.type)}RefDisconnected`
		if (typeof ref.trait[callbackName] == 'function') {
			ref.trait[callbackName](ref.el)
		}
		ref.trait = null
	}
	connectHandler(handler) {
		if (handler.listener) {
			return
		}
		handler.listener = event => {
			const target = handler.targetId ? document.getElementById(handler.targetId) : handler.el.closest(`[${config.traitAttr}]`)
			const trait = this.traits.get(target)?.[handler.token]
			if (!trait) return
			if (handler.options.prevent) event.preventDefault()
			if (handler.options.stop) event.stopPropagation()
			const paramAttr = `${this.config.attributePrefix + handler.token}.${handler.method}`
			const params = JSON.parse(handler.el.getAttribute(paramAttr) || '{}')
			for (const attr of handler.el.attributes) {
				if (attr.name.startsWith(paramAttr + '.')) {
					params[camelCase(attr.name.replace(paramAttr + '.', ''))] = JSON.parse(attr.value)
				}
			}
			trait[camelCase(handler.method)]?.(params, event)
		}
		if (!this.handlers.get(handler.el)) this.handlers.set(handler.el, {})
		this.handlers.get(handler.el)[handler.descriptor] = handler
		handler.el.addEventListener(handler.event, handler.listener, handler.options)
	}
	disconnectHandler(handler) {
		if (!handler.listener) {
			return
		}
		handler.el.removeEventListener(handler.event, handler.listener, handler.options)
		delete this.handlers.get(handler.el)[handler.descriptor]
		handler.listener = null
	}
	addOrphan(ref) {
		if (!ref.targetId) {
			this.orphans.get('').add(ref)
			return
		}
		if (!this.orphans.has(ref.targetId)) {
			this.orphans.set(ref.targetId, new Set())
		}
		this.orphans.get(ref.targetId).add(ref)
	}
	removeOrphan(ref) {
		if (ref.targetId) {
			this.orphans.get(ref.targetId)?.delete(ref)
			if (this.orphans.get(ref.targetId)?.size == 0) {
				this.orphans.delete(ref.targetId)
			}
		} else {
			this.orphans.get('').delete(ref)
		}
	}
	registerTrait(token, traitClass) {
		if (typeof token === 'object') {
			for (const [key, value] of Object.entries(token)) {
				this.registerTrait(kebabCase(key), value)
			}
			return
		}
		const self = this
		traitClass.token = token
		if (traitClass.props) this.propSyncers[token] = new PropSyncer(traitClass.props, token)
		for (const key in traitClass.props) {
			Object.defineProperty(traitClass.prototype, key, {
				get() {
					return this[`#${key}`]
				},
				set(val) {
					self.propSyncers[token].set(this, this.$el, key, val, true)
				}
			})
		}
		for (const type of traitClass.refs) {
			const camelCasedToken = camelCase(type)
			traitClass.prototype.$refs[type] = new Set()
			Object.defineProperty(traitClass.prototype, `${camelCasedToken}Refs`, {
				get() {
					return this.$refs[type] ?? []
				},
			})
			Object.defineProperty(traitClass.prototype, `${camelCasedToken}Ref`, {
				get() {
					return this.$refs[type]?.values()?.next()?.value
				},
			})
		}
		this.traitRegister[token] = traitClass
	}
}

const stim = new Stim()

class TraitHandler {
	el
	descriptor
	token
	method
	event
	options
	targetId
	constructor(el, descriptor) {
		if (!descriptor.includes('->')) {
			descriptor = `click->${descriptor}`
		}
		let eventDescriptor, optionDescriptor
		[this.el, this.descriptor, eventDescriptor, this.token, this.method, this.targetId] = [el, descriptor, ...descriptor.split(/->|\.|#/)]
		;[this.event, optionDescriptor] = eventDescriptor.split('[')
		if (optionDescriptor) {
			optionDescriptor.replace(']', '').split(' ').forEach(option => {
				let value = true
				if (option.startsWith('!')) {
					option = option.slice(1)
					value = false
				}
				this.options[option] = value
			})
		}
	}
}

class TraitRef {
	el
	descriptor
	trait
	token
	type
	targetId
	constructor(el, descriptor) {
		[this.el, this.descriptor, this.token, this.type, this.targetId] = [el, descriptor, ...descriptor.split(/[.#]/)]
	}
}

class ElementTrait {
	static token = ''
	static props = {}
	static refs = []
	$el
	$refs
	constructor(el) {
		this.$el = el
		stim.propSyncers[this.token]?.init(this)
		this.initialized()
	}
	get token() {
		return this.constructor.token
	}
	get stim() {
		return stim
	}
	get el() {
		return this.$el
	}
	initialized() {}
	connected() {}
	disconnected() {}
	attributeChanges(name, oldValue, newValue) {}
}

// todo: targetAttributeChangedCallback() with static observedTargetAttributes
//export { stim, ElementTrait }
