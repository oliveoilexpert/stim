const kebabCase = str => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())
const camelCase = str => str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

const config = {
	observeChildList: true,
	observeAttributes: true,
	observeControllerAttributes: true,
	attributePrefix: 'data-',
	controllerAttribute: 'controller',
	targetAttribute: 'target',
	actionAttribute: 'action',
}

class PropSyncer {
	#props
	#propsAttr
	#keys = {}
	constructor(props, token) {
		this.#propsAttr = `${config.attributePrefix}${token}`
		this.#props = props
		for (const key in this.#props) {
			this.#keys[key] = `${this.#propsAttr}.${kebabCase(key)}`
			this.#keys[this.#keys[key]] = key
		}
	}
	#write(key, val) {
		if (typeof this.#props[key] == 'string') return val
		if (typeof this.#props[key] == 'boolean') return val ? '' : 'false'
		try { return JSON.stringify(val) } catch { return val }
	}
	#read(key, val) {
		if (typeof this.#props[key] == 'string') return val
		if (typeof this.#props[key] == 'boolean') return val !== '0' && val !== 'false'
		try { return JSON.parse(val) } catch { return val }
	}
	init(object, element) {
		const attrProps = JSON.parse(element.getAttribute(this.#propsAttr) || '{}')
		for (const key in this.#props) {
			if (element.hasAttribute(this.#keys[key])) {
				this.set(object, element, key, this.#read(key, element.getAttribute(this.#keys[key])), false)
			} else if (key in attrProps) {
				this.set(object, element, key, attrProps[key], true)
			} else {
				this.set(object, element, key, this.#props[key], false)
			}
		}
		element.removeAttribute(this.#propsAttr)
	}
	set(object, element, key, val, sync = true) {
		if (val === object[`_${key}`]) return
		const oldVal = object[`_${key}`]
		object[`_${key}`] = val
		if (typeof object[`${key}PropChanged`] === 'function') {
			object[`${key}PropChanged`](oldVal, val)
		}
		if (!sync) return
		const defaultVal = this.#props[key]
		const writeVal = this.#write(key, val)
		if (val === defaultVal || (typeof defaultVal === 'object' && writeVal === this.#write(key, defaultVal))) {
			element.removeAttribute(this.#keys[key])
			return
		}
		element.setAttribute(this.#keys[key], writeVal)
	}
	attrChange(object, element, name, oldVal, newVal) {
		if (name === this.#propsAttr) {
			this.init(object, element)
			return
		}
		const key = this.#keys[name]
		if (!key) {
			object.attributeChanged(name, oldVal, newVal)
			return
		}
		const newReadVal = (newVal === null || newVal === undefined) ? this.#props[key] : this.#read(key, newVal)
		this.set(object, element, key, newReadVal, false)
	}
}

class Stim {
	#controllerRegister = {}
	#selectorRegister = {}
	#injectTokens = {}
	#syncers = {}
	#controllers = new WeakMap()
	#targets = new WeakMap()
	#actions = new WeakMap()
	#orphans = new Map()
	get #controllerAttr() {
		return config.attributePrefix + config.controllerAttribute
	}
	get #targetAttr() {
		return config.attributePrefix + config.targetAttribute
	}
	get #actionAttr() {
		return config.attributePrefix + config.actionAttribute
	}
	get config() {
		return config
	}
	get controllerRegister() {
		return this.#controllerRegister
	}
	get selectorRegister() {
		return this.#selectorRegister
	}
	get syncers() {
		return this.#syncers
	}
	get controllers() {
		return this.#controllers
	}
	get targets() {
		return this.#targets
	}
	get actions() {
		return this.#actions
	}
	#observer = {
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
				const newVal = el.getAttribute(mutation.attributeName)
				if (mutation.attributeName === this.#controllerAttr) {
					el.querySelectorAll(`[${this.#targetAttr}]`).forEach(targetEl => {
						this.#setTargets(targetEl, null)
						queueMicrotask(() => this.#setTargets(targetEl, targetEl.getAttribute(this.#targetAttr)))
					})
					this.#setControllers(el, newVal)
				} else if (mutation.attributeName === this.#targetAttr) {
					this.#setTargets(el, newVal)
				} else if (mutation.attributeName === this.#actionAttr) {
					this.#setActions(el, newVal)
				}
			})
		}),
		controller: new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				const el = mutation.target
				const newVal = el.getAttribute(mutation.attributeName)
				if (mutation.oldValue == newVal) return
				for (const token in this.#controllers.get(el)) {
					this.#syncers[token].attrChange(this.#controllers.get(el)[token], el, mutation.attributeName, mutation.oldValue, newVal)
				}
			})
		})
	}
	connect() {
		if (config.observeChildList) {
			this.#observer.childList.observe(document.documentElement, { childList: true, subtree: true })
		}
		if (config.observeAttributes) {
			this.#observer.attribute.observe(document.documentElement, { attributes: true, attributeOldValue: true, attributeFilter: [this.#controllerAttr, this.#targetAttr, this.#actionAttr], subtree: true })
		}
		this.connectElement(document.documentElement)
	}
	disconnect() {
		for (const type in this.#observer) {
			this.#observer[type].disconnect()
		}
		this.disconnectElement(document.documentElement)
	}
	clearMutationQueue() {
		for (const type in this.#observer) {
			this.#observer[type].takeRecords()
		}
	}
	connectElement(el) {
		if (el.nodeType !== Node.ELEMENT_NODE) return
		const selectors = Object.keys(this.#selectorRegister)
		const combinedSelector = selectors.join(',')
		;[el, ...(combinedSelector ? el.querySelectorAll(combinedSelector) : [])].forEach(element => {
			selectors.forEach(selector => {
				if (element.matches(selector)) {
					this.#selectorRegister[selector](element)
				}
			})
		})
		this.#updateSubtreeConnections(el)
	}
	disconnectElement(el) {
		if (el.nodeType !== Node.ELEMENT_NODE) return
		this.#updateSubtreeConnections(el, true)
	}
	getController(el, identifier) {
		return this.#controllers.get(el)?.[identifier] || null
	}
	#updateSubtreeConnections(rootEl, disconnect = false) {
		const actionEls = [], targetEls = [], controllerEls = []
		;[rootEl, ...rootEl.querySelectorAll(`[${this.#controllerAttr}],[${this.#targetAttr}],[${this.#actionAttr}]`)].forEach(el => {
			if (disconnect != Boolean(el.__stim_connected)) return
			el.hasAttribute(this.#controllerAttr) && controllerEls.push(el)
			el.hasAttribute(this.#targetAttr) && targetEls.push(el)
			el.hasAttribute(this.#actionAttr) && actionEls.push(el)
			el.__stim_connected = !disconnect
		})
		controllerEls.forEach(el => this.#setControllers(el, disconnect ? null : el.getAttribute(this.#controllerAttr)))
		targetEls.forEach(el => this.#setTargets(el, disconnect ? null : el.getAttribute(this.#targetAttr)))
		actionEls.forEach(el => this.#setActions(el, disconnect ? null : el.getAttribute(this.#actionAttr)))
	}
	#setControllers(el, tokens) {
		const controllers = this.#controllers.get(el) ?? {}
		const addTokens = new Set(tokens?.split(' ').flatMap(token => this.#injectTokens[token] ?? []))
		const removeTokens = new Set(Object.keys(controllers))
		addTokens.forEach(propToken => {
			const token = propToken.split('/')[0]
			removeTokens.delete(token)
			this.#addController(el, propToken)
		})
		removeTokens.forEach(token => this.#removeController(controllers[token]))
	}
	#addController(el, propToken) {
		if (!this.#controllers.get(el)) this.#controllers.set(el, {})
		const [token, injectorToken] = propToken.split('/')
		let controller = this.#controllers.get(el)[token]
		if (!controller) {
			controller = this.#controllers.get(el)[token] = new this.#controllerRegister[token](el, propToken)
			if (!this.#syncers[propToken]) {
				this.#syncers[propToken] = new PropSyncer(
					{...this.#controllerRegister[token].props, ...this.#controllerRegister[injectorToken]?.injects[token] ?? {}},
					token
				)
			}
			this.#syncers[propToken].init(controller, el)
			controller.initialized()
		}
		if (config.observeControllerAttributes) this.#observer.controller.observe(el, {attributes: true, attributeOldValue: true})
		this.#connectInstance(controller, () => {
			controller.connected()
			if (el.id && this.#orphans.has(el.id)) {
				this.#orphans.get(el.id).forEach(target => {
					if (target.token == token) {
						this.#addTarget(target)
					}
				})
			}
			return true
		})
	}
	#removeController(controller) {
		this.#disconnectInstance(controller, () => {
			controller.disconnected()
			for (const type in controller.$targets) {
				controller.$targets[type].forEach(target => this.#removeTarget(target, true))
			}
		})
	}
	#setTargets(el, descriptors = null) {
		const targets = this.#targets.get(el) ?? {}
		const descriptorSet = new Set(descriptors?.split(' '))
		for (const descriptor in targets) {
			if (!descriptorSet.has(descriptor)) {
				this.#removeTarget(targets[descriptor])
			}
		}
		descriptorSet.forEach(descriptor => {
			this.#addTarget(this.#targets.get(el)?.[descriptor] || new ControllerTarget(el, descriptor))
		})
	}
	#addTarget(target) {
		this.#connectInstance(target, () => {
			const host = target.hostId ? document.getElementById(target.hostId) : target.el.closest(`[${this.#controllerAttr}]`)
			target.controller = this.#controllers.get(host)?.[target.token]
			if (!target.controller?.$connected) {
				this.#addOrphan(target)
				return false
			}
			this.#removeOrphan(target)
			if (!this.#targets.get(target.el)) this.#targets.set(target.el, {})
			this.#targets.get(target.el)[target.descriptor] = target
			target.controller.$targets[target.type].add(target.el)
			const callbackName = `${camelCase(target.type)}TargetConnected`
			if (typeof target.controller[callbackName] == 'function') {
				target.controller[callbackName](target.el)
			}
			return true
		})
	}
	#removeTarget(target, addOrphan = false) {
		this.#disconnectInstance(target, () => {
			addOrphan ? this.#addOrphan(target) : this.#removeOrphan(target)
			target.controller.$targets[target.type].delete(target.el)
			const callbackName = `${camelCase(target.type)}TargetDisconnected`
			if (typeof target.controller[callbackName] == 'function') {
				target.controller[callbackName](target.el)
			}
		})
	}
	#setActions(el, descriptors = null) {
		const actions = this.#actions.get(el) ?? {}
		const descriptorSet = new Set(descriptors?.split(' '))
		for (const descriptor in actions) {
			if (!descriptorSet.has(descriptor)) {
				this.#removeAction(actions[descriptor])
			}
		}
		descriptorSet.forEach(descriptor => {
			this.#addAction(this.#actions.get(el)?.[descriptor] || new ControllerAction(el, descriptor))
		})
	}
	#addAction(action) {
		this.#connectInstance(action, () => {
			action.listener = event => {
				const host = action.hostId ? document.getElementById(action.hostId) : action.el.closest(`[${this.#controllerAttr}]`)
				const controller = this.#controllers.get(host)?.[action.token]
				if (!controller?.$connected) return
				if (action.options.prevent) event.preventDefault()
				if (action.options.stop) event.stopPropagation()
				const paramAttr = `${config.attributePrefix + action.token}.${action.method}`
				const params = JSON.parse(action.el.getAttribute(paramAttr) || '{}')
				for (const attr of action.el.attributes) {
					if (attr.name.startsWith(`${paramAttr}.`)) {
						const key = camelCase(attr.name.replace(`${paramAttr}.`, ''))
						try {
							params[key] = JSON.parse(attr.value)
						} catch {
							params[key] = attr.value
						}
					}
				}
				controller[camelCase(action.method)]?.(params, event)
			}
			if (!this.#actions.get(action.el)) this.#actions.set(action.el, {})
			this.#actions.get(action.el)[action.descriptor] = action
			action.el.addEventListener(action.event, action.listener, action.options)
			return true
		})
	}
	#removeAction(action) {
		this.#disconnectInstance(action, () => action.el.removeEventListener(action.event, action.listener, action.options))
	}
	#connectInstance(instance, callback) {
		instance.$connecting = true
		queueMicrotask(() => {
			if (instance.$connected || !instance.$connecting) return
			instance.$connecting = false
			instance.$connected = callback()
		})
	}
	#disconnectInstance(instance, callback) {
		instance.$connecting = false
		if (!instance.$connected) return
		instance.$connected = false
		callback()
	}
	#addOrphan(target) {
		if (target.hostId) {
			if (!this.#orphans.has(target.hostId)) {
				this.#orphans.set(target.hostId, new Set())
			}
			this.#orphans.get(target.hostId).add(target)
		}
	}
	#removeOrphan(target) {
		if (target.hostId) {
			this.#orphans.get(target.hostId)?.delete(target)
			if (this.#orphans.get(target.hostId)?.size == 0) {
				this.#orphans.delete(target.hostId)
			}
		}
	}
	registerController(token, controllerClass) {
		if (typeof token === 'object') {
			for (const key in token) {
				this.registerController(kebabCase(key), token[key])
			}
			return
		}
		const self = this
		controllerClass.token = token
		for (const key in controllerClass.props) {
			Object.defineProperty(controllerClass.prototype, key, {
				get() {
					return this[`_${key}`]
				},
				set(val) {
					self.syncers[this.$proptoken].set(this, this.$el, key, val, true)
				}
			})
		}
		for (const type of controllerClass.targets) {
			const camelCasedType = camelCase(type)
			Object.defineProperty(controllerClass.prototype, `${camelCasedType}Targets`, {
				get() {
					return this.$targets[type] ?? new Set()
				},
			})
			Object.defineProperty(controllerClass.prototype, `${camelCasedType}Target`, {
				get() {
					return this.$targets[type]?.values()?.next()?.value
				},
			})
		}
		this.#injectTokens[token] = [token]
		for (const injectToken in controllerClass.injects) {
			Object.defineProperty(controllerClass.prototype, `${camelCase(injectToken)}Inject`, {
				get() {
					return self.getController(this.$el, injectToken)
				},
			})
			this.#injectTokens[token].push(`${injectToken}/${token}`)
		}
		this.#controllerRegister[token] = controllerClass
		controllerClass.registered(token, this)
	}
	registerSelectorCallback(selector, callback) {
		if (typeof selector === 'object') {
			for (const key in selector) {
				this.registerSelectorCallback(key, selector[key])
			}
			return
		}
		this.#selectorRegister[selector] = callback
	}
}

const stim = new Stim()

const defaultEvents = {
	'FORM': 'submit',
	'INPUT': 'input',
	'TEXTAREA': 'input',
	'SELECT': 'change',
	'DETAILS': 'toggle',
}

class ControllerAction {
	options = {}
	constructor(el, descriptor) {
		this.descriptor = descriptor
		if (!descriptor.includes('->')) {
			descriptor = `${defaultEvents[el.tagName] ?? 'click'}->${descriptor}`
		}
		let eventDescriptor, optionDescriptor
		;[this.el, eventDescriptor, this.token, this.method] = [el, ...descriptor.split(/->|\.|#/, 3)]
		this.hostId = descriptor.includes('#') ? descriptor.slice(descriptor.lastIndexOf('#') + 1) : ''
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

class ControllerTarget {
	constructor(el, descriptor) {
		[this.el, this.descriptor, this.token, this.type] = [el, descriptor, ...descriptor.split(/[.#]/, 2)]
		this.hostId = descriptor.includes('#') ? descriptor.slice(descriptor.lastIndexOf('#') + 1) : ''
	}
}

class Controller {
	static token = ''
	static props = {}
	static targets = []
	static injects = {}
	static registered(identifier, stim) {}
	get identifier() {
		return this.constructor.token
	}
	get element() {
		return this.$el
	}
	get stim() {
		return stim
	}
	constructor(el, propToken) {
		this.$el = el
		this.$proptoken = propToken
		this.$targets = Object.fromEntries(this.constructor.targets.map(key => [key, new Set()]))
	}
	initialized() {}
	connected() {}
	disconnected() {}
	attributeChanged(name, oldValue, newValue) {}
	dispatch(type, options = {}) {
		const prefix = options.prefix ?? this.identifier
		const event = new CustomEvent(prefix ? `${prefix}:${type}` : type, options)
		;(options.target ?? this.$el).dispatchEvent(event)
		return event
	}
}

export { stim, Controller }
