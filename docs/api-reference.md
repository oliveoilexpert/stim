# Stim API Reference

This document provides a complete reference for all APIs, properties, methods, and options available in Stim.

## Table of Contents

- [Controller Class](#controller-class)
- [Stim Object](#stim-object)
- [HTML Attributes](#html-attributes)
- [Configuration Options](#configuration-options)

## Controller Class

The base class that all controllers extend from.

**Static Properties:**

`static props`
: An object that defines the controller's props and their default values.

`static targets`
: An array of strings that defines different types of elements that can be targeted to this controller.

`static injects`
: An object of controller identifier keys to props objects. Controllers with matching identifier will be instantiated, with the prop values overriding the default values of the injected controller.

**Static Methods:**

`static registered()`
: Called after the controller is registered with `stim.registerController()`.

**Instance Properties:**

`element`
: The host element (the element with the `data-controller` attribute that instantiated the controller).

`stim`
: Reference to the stim instance.

`identifier`
: The identifier the controller was registered with, usually the kebab-case class name.

`[propName]`
: Instance property synced with `data-[identifier].[prop-name]` on the host element.

`[targetType]Targets`
: A set of targeted elements of type `[targetType]`.

`[targetType]Target`
: The first targeted element of type `[targetType]`.

`[controllerIdentifier]Controller`
: Reference to an injected controller.

**Lifecycle Methods:**

`initialized()`
: Called when the controller is instantiated on the host element, before `connected()`.

`connected()`
: Called when an element with `data-controller="[identifier]"` is added to the DOM.

`disconnected()`
: Called when the host element is removed from the DOM.

**Callback Methods:**

`attributeChanged(name, oldValue, newValue)`
: Called when an HTML attribute on the host element changes that is not part of the controller props.

`[propName]PropChanged(oldValue, newValue)`
: Called when the property `[propName]` changes.

`[targetType]TargetConnected(element)`
: Called when an element with `data-target="[identifier].[target-type]"` is added to the DOM.

`[targetType]TargetDisconnected(element)`
: Called when the targeted element is removed from the DOM.

**Instance Methods:**

`dispatch(eventType, {target, prefix, detail, bubbles, cancelable, composed})`
: Dispatches a custom event on the host element (or another target) with the given type and options. The prefix will be appended to the event type with a : separator. Default prefix is the identifier.

## Stim Object

The global stim instance that manages controllers and configuration.

**Properties:**

`config`
: Configuration options for stim. See [Configuration Options](#configuration-options).

`controllers`
: A set of all connected controllers.

`refs`
: An empty map for storing references.

**Methods:**

`registerController(identifier, ControllerClass)` or `registerController({ ControllerClass, ... })`
: Register a controller with stim.

`registerSelectorCallback(selector, callback)` or `registerSelectorCallback({ selector: callback ... })`
: Register a callback that is called when a new element matching the selector is added to the DOM.

`connect()`
: Connect all elements to their controllers and start mutation observers.

`disconnect()`
: Disconnect all controllers and observers.

`getController(element, identifier)`
: Get the controller with matching identifier connected to the element.

`connectElement(element)`
: Manually connect an element and its children to Stim. Not needed with standard observer settings.

`disconnectElement(element)`
: Manually disconnect an element and its children from Stim. Not needed with standard observer settings.

## HTML Attributes

`data-controller="[identifier]"`
: Create controller on an element.

`data-target="[identifier].[target-type]"`
: Target element as target-type to the closest controller with identifier.

`data-target="[identifier].[target-type]#[id]"`
: Target element as target-type to the controller with identifier on element with ID id.

`data-[identifier].[prop-name]="[value]"`
: Set a controller prop value.

`data-[identifier]='{"[propName]": "[value]"}'`
: Set multiple controller props using JSON.

`data-action="[event]->[identifier].[method-name]"`
: Set up an event action that calls a controller method.

`data-action="[identifier].[method-name]"`
: Set up an event action using the default event for the element type.

`data-action="[event][options]->[identifier].[method-name]"`
: Set up an event action with options.

`data-[identifier].[method-name].[parameter-name]="[value]"`
: Set a parameter for an action method.

`data-[identifier].[method-name]='{"[parameter-name]": "[value]"}'`
: Set multiple parameters for an action method using JSON.

## Configuration Options

Customize Stim by setting options on `stim.config` before calling `stim.connect()`.

`observeChildList`
: Default: `true`  
Whether to observe the document body for new elements with `controller` and `action` attributes.

`observeAttributes`
: Default: `true`  
Whether to observe the document body for changes to the `controller` and `action` attributes.

`observeControllerAttributes`
: Default: `true`  
Whether to observe attribute changes on controller elements.

`attributePrefix`
: Default: `data-`  
The prefix for all HTML attributes.

`controllerAttribute`
: Default: `controller`  
The attribute that instantiates controllers on elements.

`targetAttribute`
: Default: `target`  
The attribute that connects targets to controllers.

`actionAttribute`
: Default: `action`  
The attribute that attaches event listeners to elements.
