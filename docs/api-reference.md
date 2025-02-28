# Stim API Reference

This document provides a complete reference for all APIs, properties, methods, and options available in Stim.

## Table of Contents

- [Aspect Class](#aspect-class)
- [Stim Object](#stim-object)
- [HTML Attributes](#html-attributes)
- [Configuration Options](#configuration-options)

## Aspect Class

The base class that all aspects extend from.

**Static Properties:**

`static attributes`
: An object that defines the aspect's attributes and their default values.

`static elements`
: An array of strings that defines different types of elements that can be connected to this aspect.

`static aspects`
: An array of strings or an object that defines the aspects that this aspect will inject and instantiate.

**Static Methods:**

`static shouldRegister()`
: Called before the aspect is registered with `stim.registerAspect()`. If it returns false, the aspect is not registered.

`static registered()`
: Called after the aspect is registered with `stim.registerAspect()`.

**Instance Properties:**

`element` or `el`
: The host element (the element with the `data-connect` attribute that instantiated the aspect).

`stim`
: Reference to the stim instance.

`token`
: The token that instantiated the aspect (string in the `data-connect` attribute).

`[attributeName]`
: Instance property synced with `data-[aspect-token].[attribute-name]` on the host element.

`[elementType]Elements`
: A set of connected elements of type `[elementType]`.

`[elementType]Element`
: The first connected element of type `[elementType]`.

`[aspectToken]Aspect`
: Reference to an injected aspect.

**Lifecycle Methods:**

`initialized()`
: Called when the aspect is instantiated on the host element, before `connected()`.

`connected()`
: Called when an element with `data-connect="[aspect-token]"` is added to the DOM.

`disconnected()`
: Called when the host element is removed from the DOM.

**Callback Methods:**

`attributeChanged(name, oldValue, newValue)`
: Called when an HTML attribute on the host element changes that is not part of the aspect attributes.

`[attributeName]Changed(oldValue, newValue)`
: Called when the property `[attributeName]` changes.

`[elementType]ElementConnected(element)`
: Called when an element with `data-connect="[aspect-token].[connected-element-type]"` is added to the DOM.

`[elementType]ElementDisconnected(element)`
: Called when the connected element is removed from the DOM.

**Instance Methods:**

`dispatch(eventType, {target, prefix, detail, bubbles, cancelable, composed})`
: Dispatches a custom event on the host element (or another target) with the given type and options. The prefix will be appended to the event type with a : separator. Default prefix is the aspect-token.

## Stim Object

The global stim instance that manages aspects and configuration.

**Properties:**

`config`
: Configuration options for stim. See [Configuration Options](#configuration-options).

`aspects`
: A set of all connected aspects.

**Methods:**

`registerAspect(aspect-token, AspectClass)` or `registerAspect({ aspectToken: AspectClass, ... })`
: Register an aspect with stim.

`registerCustomElement(aspect-token)`
: Register a registered aspect as a custom element.

`registerSelectorCallback(selector, callback)`
: Register a callback that is called when a new element matching the selector is added to the DOM.

`connect()`
: Connect all elements to their aspects and start mutation observers.

`disconnect()`
: Disconnect all aspects and observers.

`getAspects(element)`
: Get all aspects connected to an element.

`getAspect(element, aspectToken)`
: Get the aspect with the token `aspectToken` connected to the element.

`connectNode(node)`
: Manually connect a node and its children to Stim. Not needed with standard observer settings.

`disconnectNode(node)`
: Manually disconnect a node and its children from Stim. Not needed with standard observer settings.

## HTML Attributes

`data-connect="[aspect-token]"`
: Create aspect on an element.

`data-connect="[aspect-token].[element-type]"`
: Connect element as element-type to the closest aspect with aspect-token.

`data-connect="[aspect-token].[element-type]#[id]"`
: Connect element as element-type to the aspect with aspect-token on element with ID id.

`data-[aspect-token].[attribute-name]="[value]"`
: Set an aspect attribute value.

`data-[aspect-token]='{"[attribute-name]": "[value]"}'`
: Set multiple aspect attributes using JSON.

`data-handler="[event]->[aspect-token].[method-name]"`
: Set up an event handler that calls an aspect method.

`data-handler="[aspect-token].[method-name]"`
: Set up an event handler using the default event for the element type.

`data-handler="[event][options]->[aspect-token].[method-name]"`
: Set up an event handler with options.

`data-[aspect-token].[method-name].[parameter-name]="[value]"`
: Set a parameter for a handler method.

`data-[aspect-token].[method-name]='{"[parameter-name]": "[value]"}'`
: Set multiple parameters for a handler method using JSON.

## Configuration Options

Customize Stim by setting options on `stim.config` before calling `stim.connect()`.

`observeChildList`
: Default: `true`  
  Whether to observe the document body for new elements with `connect` and `handler` attributes.

`observeAttributes`
: Default: `true`  
  Whether to observe the document body for changes to the `connect` and `handler` attributes.

`observeAspectAttributes`
: Default: `true`  
  Whether to observe attribute changes on aspect elements.

`attributePrefix`
: Default: `data-`  
  The prefix for all HTML attributes.

`connectAttribute`
: Default: `connect`  
  The attribute that connects elements to aspects.

`handlerAttribute`
: Default: `handler`  
  The attribute that attaches event listeners to elements.

`scopeAttribute`
: Default: `scope`  
  The attribute that defines the scope of an aspect (internal functionality).

`customElementPrefix`
: Default: `aspect-`  
  The prefix for custom elements.
