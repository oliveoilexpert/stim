# Stim Guide

This guide provides a comprehensive explanation of Stim, taking you from the basics to advanced usage.

## Table of Contents

- [Introduction to Stim](#introduction-to-stim)
  - [What is Stim?](#what-is-stim)
  - [The Basic Pattern](#the-basic-pattern)
- [Getting Started](#getting-started)
  - [Creating Your First Controller](#creating-your-first-controller)
  - [Connecting Controllers to HTML](#connecting-controllers-to-html)
  - [Registering Controllers](#registering-controllers)
- [Core Features](#core-features)
  - [Props](#props)
  - [Lifecycle Methods](#lifecycle-methods)
  - [Targets](#targets)
  - [Actions](#actions)
- [Controller Relationships & Scope](#controller-relationships--scope)
  - [Scope and Remote Connections](#scope-and-remote-connections)
  - [Controller Injection](#controller-injection)
  - [Custom Events](#custom-events)
  - [Controller Communication Strategies](#controller-communication-strategies)
- [Configuration Options](#configuration-options)
- [Stim Syntax Cheat Sheet](#stim-syntax-cheat-sheet)

## Introduction to Stim

### What is Stim?

When dynamically updating the DOM via AJAX or libraries like HTMX and Turbo, you need a way to attach JavaScript behavior to new elements. Stim provides a structured approach to define and connect JavaScript behaviors to HTML elements.

> **🧠 Mental Model**: If you're familiar with other frameworks, Stim is like a lighter version of Stimulus. It focuses on adding behavior to existing HTML rather than taking over the rendering.


### The Basic Pattern

Stim follows a simple pattern:

1. You create **Controllers** (JavaScript classes)
2. You declare which **HTML elements** use those controllers by adding `data-controller` attributes
3. Stim looks for these attributes on existing and dynamically added elements and instantiates the corresponding controllers

## Getting Started

### Creating Your First Controller

A controller is a JavaScript class that adds behavior to an HTML element. Let's create a simple dropdown controller:

```javascript
import { Controller } from '@oliveoilexpert/stim';

export default class Dropdown extends Controller {
  // Properties that sync with HTML attributes
  static props = {
    open: false
  };
  
  // Custom method to toggle the dropdown
  toggle() {
    // This will flip the open state
    this.open = !this.open;
  }
}
```

This simple controller defines:
- An `open` prop that defaults to `false`
- A `toggle()` method that flips the `open` state

### Connecting Controllers to HTML

To use a controller, you connect it to an HTML element using the `data-controller` attribute:

```html
<div data-controller="dropdown" data-dropdown.open="true">
  <button>Toggle Menu</button>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

Here's what this HTML does:
- `data-controller="dropdown"` connects the `Dropdown` controller to the `div`
- `data-dropdown.open="true"` changes the initial value of the `open` prop

> **📝 Naming Convention**: HTML attributes for controllers use the format `data-[controller-identifier].[prop-name]`. The prop name in HTML uses kebab-case (like `my-attribute`) to match the camelCase JavaScript property (like `myAttribute`).

One Element can use multiple controllers:

```html
<div data-controller="dropdown list-filter">
  <!-- This element uses both the dropdown and list-filter controllers -->
</div>
```


### Registering Controllers

Before Stim can use your controllers, you need to register them:

```javascript
import { stim } from '@oliveoilexpert/stim';
import Dropdown from './dropdown';

// Register the dropdown controller
stim.registerController('dropdown', Dropdown);

// Start Stim (connect controllers to the DOM)
stim.connect();
```

You can also register multiple controllers at once:

```javascript
// Register multiple controllers with an object
stim.registerController({
  'dropdown': Dropdown,
  'list-filter': ListFilter
});

// Even shorter (key will be kebab-cased automatically)
stim.registerController({
   Dropdown,  // becomes 'dropdown'
   ListFilter // becomes 'list-filter'
});
```

> **📝 Naming Convention**: The controller token (the string used to identify the controller in HTML) is always kebab-case. When registering using the shorthand object notation, Stim will automatically convert class names to kebab-case.

Now our dropdown controller is registered, but it doesn't actually do anything with the open state yet. Let's expand it to make it functional.

## Core Features

### Props

Props are properties that synchronize between your JavaScript and HTML. They serve as both state and configuration for your controllers.

> **🧠 Mental Model**: Think of props as
> reactive properties that automatically stay in sync between your JavaScript code and the HTML DOM.

In our Dropdown example, we have an `open` prop:

```javascript
static props = {
  open: false,           // Boolean with default false
};
```

This creates a two-way binding:

1. When you change the property in JavaScript:
   ```javascript
   this.open = true;  // Updates data-dropdown.open in HTML
   ```

2. When the HTML attribute changes:
   ```html
   <div data-dropdown.open="true"></div>  <!-- Updates this.open in JS -->
   ```

One key advantage of this approach is that **state is saved in the HTML itself**. This means:
- Components can be transported as HTML strings without losing state
- The state can be inspected by looking at the DOM
- Server-side rendering can set initial state easily

#### Type Conversion

Stim automatically converts attribute values to the appropriate JavaScript type with `JSON.parse`:

```html
<!-- Type conversion examples -->
<div data-controller="my-controller"
     data-my-controller.count="42"           <!-- Becomes number 42 -->
     data-my-controller.active="true"        <!-- Becomes boolean true -->
     data-my-controller.tags='["a","b","c"]' <!-- Becomes array ["a", "b", "c"] -->
     data-my-controller.config='{"key":"value"}' <!-- Becomes object {key: "value"} -->
</div>
```

For booleans, any value that is not exactly the string "false" or "0" is considered `true`.

When a property value equals its default value from `static props`, the HTML attribute is removed from the element.

#### Prop Callbacks

You can define methods that are called when props change:

```javascript
// This is called when the 'open' prop changes
openPropChanged(oldValue, newValue) {
  if (newValue) {
    // this.element is the host element, i.e. the element with data-controller
    this.element.classList.add('is-open');
  } else {
    this.element.classList.remove('is-open');
  }
}
```

The callback name follows the pattern `[propName]PropChanged`. It receives the old and new values as arguments.

For non-controller attributes (HTML attributes not defined in your `static props`), you can use the general `attributeChanged` callback:

```javascript
// Called when any non-controller attribute changes
attributeChanged(name, oldValue, newValue) {
  if (name === 'class') {
    // React to class changes
  }
}
```

#### Bulk Setting Props

Set multiple props at once using JSON:

```html
<!-- Bulk prop setting -->
<div data-controller="dropdown" 
     data-dropdown='{"open": true, "animationDuration": 500}'>
</div>
```

This is equivalent to:

```html
<!-- Individual prop setting -->
<div data-controller="dropdown" 
     data-dropdown.open="true"
     data-dropdown.animation-duration="500">
</div>
```

The bulk attribute is processed and then replaced with individual equivalents. If there's overlap between bulk and individual attributes, the individual attributes take precedence.

### Lifecycle Methods

Controllers have lifecycle methods that are called at specific moments:

```javascript
// Called when the controller is instantiated
initialized() {
  console.log('Dropdown initialized');
}

// Called when the host element is added to the DOM
connected() {
  console.log('Dropdown connected to', this.element);
}

// Called when the host element is removed from the DOM
disconnected() {
  console.log('Dropdown disconnected');
}
```

These lifecycle methods help you properly set up and clean up your controllers.

#### Lifecycle Sequence

When an element with a `data-controller` attribute is found in the DOM, Stim follows this sequence:

1. Any injected controllers are instantiated first (we'll cover this later)
2. The controller class is instantiated with the element as context
3. Default prop values from `static props` are applied
4. Props from HTML are parsed and applied to the instance
5. The `initialized()` method is called
6. The `connected()` method is called
7. Targets are processed (we'll cover this next)

> **⚠️ Important**: The `initialized()` method is called before the controller is connected to the DOM. This makes it ideal for operations that might cause DOM changes, like moving the element to a different parent. Doing such operations in `connected()` would trigger an additional disconnect/reconnect cycle.

#### Handling DOM Changes

When an element is removed from the DOM and then added back, the controller instance is preserved. The lifecycle flow is:

1. Element is removed → `disconnected()` is called
2. Element is added back → `connected()` is called again

#### Cleaning Up Resources

It's essential to clean up any resources your controller creates, particularly:

- Event listeners added to `document`, `window`, or any element outside your host element
- Timers created with `setTimeout` or `setInterval`
- AJAX requests or Promises that might complete after disconnection
- References to DOM elements that might prevent garbage collection

```javascript
connected() {
  document.addEventListener('click', this._handleOutsideClick);
}

disconnected() {
  document.removeEventListener('click', this._handleOutsideClick);
}
```

### Targets

While we could use `querySelector` to find elements related to our controller, Stim provides a better way: targets.

> **🧠 Mental Model**: Think of targets as named references to important parts of your UI. Instead of using `querySelector`, you're explicitly connecting elements to your controller.

First, define the types of elements your controller needs:

```javascript
export default class Dropdown extends Controller {
  static props = {
    open: false
  };
  
  // Define the types of elements we want to target
  static targets = ['toggleButton', 'menu'];
}
```

Then, connect those elements in HTML:

```html
<div data-controller="dropdown">
  <button data-target="dropdown.toggleButton">Toggle</button>
  <ul data-target="dropdown.menu">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

Now you can access those elements through properties:

- `this.toggleButtonTargets` - A set containing all targeted toggleButton elements
- `this.toggleButtonTarget` - The first toggleButton element (convenience accessor)

You can also define callbacks for when targets are connected or disconnected:

```javascript
static targets = ['toggleButton', 'menu'];

// Called when a toggleButton target is connected
toggleButtonTargetConnected(button) {
  button.addEventListener('click', () => this.toggle());
}

toggleButtonTargetDisconnected(button) {
  // do stuff when the button is disconnected
}

// Called when a dropdown-menu target is connected
menuTargetConnected(menu) {
  menu.hidden = !this.open;
}

// Called when the open prop changes
openPropChanged(oldValue, newValue) {
  if (this.menuTarget) {
    this.menuTarget.hidden = !newValue;
  }
}

toggle() {
  this.open = !this.open;
}

```

> **⚠️ Important**: Targets are processed *after* the `connected()` lifecycle method. Don't try to access target collections like `this.toggleButtonTargets` in your `connected()` method. Use the target-specific callbacks instead.

#### Multiple Connections on One Element

One element can have multiple connections:

```html
<div data-controller="fancy-button" data-target="dropdown.toggleButton select.option">
  <!-- This element hosts the fancy-button controller while targeted 
       in multiple roles to other controllers -->
</div>
```

In the example above, the div:
1. Hosts the `fancy-button` controller
2. Is targeted as a `toggleButton` to a `dropdown` controller
3. Is targeted as an `option` to a `select` controller

#### Dynamic Elements

Targets work with dynamic content. If elements are added or removed after the controller is connected, the appropriate callbacks are called automatically:

```javascript
// Dynamically adding a target
addMenuItem(text) {
  const item = document.createElement('li');
  item.textContent = text;
  
  // Target it as a menu-item
  item.dataset.target = 'dropdown.menuItem';
  
  // Add it to the menu
  this.menuTarget.appendChild(item);
  
  // menuItemTargetConnected will be called automatically
}
```

### Actions

While we can add event listeners in the target callbacks, Stim provides a more declarative way: actions.

> **🧠 Mental Model**: Actions are like event listeners declared in HTML. Instead of adding listeners in JavaScript, you specify them directly in your markup.

Basic action syntax:

```html
<button data-action="click->dropdown.toggle">Toggle Menu</button>
```

This tells Stim: "When this button is clicked, call the `toggle` method on the `dropdown` controller."

For commonly used events, you can omit the event name:

```html
<!-- This also calls dropdown.toggle on click (default event for buttons) -->
<button data-action="dropdown.toggle">Toggle Menu</button>
```

Let's update our dropdown example to use actions:

```html
<div data-controller="dropdown">
  <button data-action="dropdown.toggle">Toggle Menu</button>
  <ul data-target="dropdown.menu">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

```javascript
export default class Dropdown extends Controller {
  static props = {
    open: false
  };
  
  static targets = ['menu'];
  
  menuTargetConnected(menu) {
    menu.hidden = !this.open;
  }
  
  openPropChanged(oldValue, newValue) {
    if (this.menuTarget) {
      this.menuTarget.hidden = !newValue;
    }
  }
  
  toggle() {
    this.open = !this.open;
  }
}
```

We've removed the need for the `toggleButtonTargetConnected` method since we're using an action instead.

#### Default Events

Different elements have different default events:

| Element | Default Event | Element | Default Event |
|---------|---------------|---------|---------------|
| `button` | click | `input` | input |
| `input[type="submit"]` | click | `textarea` | input |
| `select` | change | `form` | submit |
| `details` | toggle | everything else | click |

#### Event Options

You can specify options for the event listener:

```html
<button data-action="click[once prevent]->dropdown.toggle">
  Toggle Menu (once)
</button>
```

Available options:
- `once`: Call the handler at most once
- `passive`: Indicates the callback won't call preventDefault()
- `capture`: Use capture phase instead of bubbling
- `prevent`: Call event.preventDefault() before the method
- `stop`: Call event.stopPropagation() before the method

Adding `!` before an option negates it (e.g., `[!passive]`).

#### Passing Parameters to Actions

You can pass parameters to action methods:

```html
<button data-action="dropdown.toggle"
        data-dropdown.toggle.force="true">
  Force Open
</button>
```



```javascript
toggle({force} = {}, event) {
  if (force !== undefined) {
    this.open = !!force;  // Force to the specified value
  } else {
    this.open = !this.open;  // Toggle the current value
  }
}
```

The action method receives:
1. An object containing the parameters
2. The original DOM event

You can also set parameters in bulk using JSON:

```html
<button data-action="dropdown.toggle" 
        data-dropdown.toggle='{"force": true, "animate": false}'>
  Force Open
</button>
```

#### Multiple Actions on One Element

One element can have multiple actions:

```html
<button data-action="dropdown.toggle analytics.trackClick">
  Multi-action Button
</button>
```

This will call both the `toggle` method on the `dropdown` controller and the `trackClick` method on the `analytics` controller when the button is clicked.

## Controller Relationships & Scope

### Scope and Remote Connections

By default, Stim only looks for targets and actions within their host element's DOM subtree, creating a scope boundary.

#### Default Scope Boundaries

Each controller has a default scope limited to its host element's descendants:

```html
<!-- Default scope: Everything within this div -->
<div data-controller="dropdown">
  <!-- These are in scope for dropdown -->
  <button data-action="dropdown.toggle">Toggle</button>
  <ul data-target="dropdown.menu">...</ul>
</div>
```

Elements outside this scope are not automatically accessible:

```html
<!-- NOT in scope for dropdown, will not connect to controller -->
<button data-action="dropdown.toggle">Outside Toggle</button>
<ul data-target="dropdown.menu">...</ul>

<div data-controller="dropdown">
  <!-- Content -->
</div>
```

When nesting controllers, each creates its own scope boundary:

```html
<div data-controller="dropdown">
  <div data-controller="list-filter">
    <!-- NOT in scope for dropdown -->
    <button data-action="dropdown.toggle">Inner Toggle</button>
    <ul data-target="dropdown.menu">...</ul>
  </div>
</div>
```

#### Remote Connections

To connect elements across scope boundaries, use element IDs:

```html
<!-- Remote connection using ID -->
<button data-target="modal.toggleButton#login-modal">Show Login</button>

<!-- Target element with matching ID -->
<div id="login-modal" data-controller="modal">...</div>
```

Remote connections also work for action elements:

```html
<!-- Remote connection using ID -->
<button data-action="modal.show#login-modal">Show Login</button>

<!-- Target element with matching ID -->
<div id="login-modal" data-controller="modal">...</div>
```

### Controller Injection

Controller injection lets one controller use another controller's functionality. This encourages composition over inheritance.

> **🧠 Mental Model**: Think of controller injection as a way to say "my controller needs the functionality of these other controllers" without having to extend them.

```javascript
export default class Select extends Controller {
  // Inject the dropdown and form-field controllers
  // Note: Controller identifiers must use kebab-case
  static injects = {
    'form-field': {},
    'dropdown': {
       closeOnClick: true,
    }
  }
  
  static targets = ['option']
  
  optionTargetConnected(option) {
    option.addEventListener('click', (event) => {
      // access injected controllers directly
      this.formFieldInject.value = option.value;
      this.dropdownInject.toggle({}, event);
    });
  }
}
```


> **📝 Naming Convention**: Controller tokens in `static injects` must use kebab-case (like `form-field`), but they become camelCase properties in JavaScript (like `formFieldInject`).

With the values of the `injects` property you can override the default values of the injected controllers' `static props`.

> **⚠️ Important**: Directly calling lifecycle methods of injected controllers is *not* recommended, as they are only callbacks for the controller's lifecycle managed by Stim. Calling them will *not* trigger the lifecycle itself.

When a `Select` controller is instantiated, Stim will:
1. Create a `Dropdown` controller on the same element
2. Create a `FormField` controller on the same element
3. Make them available as `this.dropdownInject` and `this.formFieldInject`

This is powerful for building complex components from smaller, reusable parts.

#### Injected Controllers in HTML

Injected controllers' props, targets and actions are set up just like they are for "normal" controllers:

```html
<!-- Select controller with injected dropdown and form-field controllers -->
<!-- data-form-field.validation and data-dropdown set props on the injected controllers -->
<div data-controller="select" 
     data-form-field.validation="..." 
     data-dropdown='{ "open": true }'>
  <!-- data-target="form-field.input" declares a target of the injected form-field controller -->
  <input data-target="form-field.input" type="hidden"/>
  <!-- data-action="dropdown.toggle" declares an action of the injected dropdown controller -->
  <button data-action="dropdown.toggle">Open Options</button>
  <ul data-target="dropdown.menu">
    <li data-target="select.option" value="1">Option 1</li>
    <li data-target="select.option" value="2">Option 2</li>
  </ul>
```

### Custom Events

Controllers can communicate with each other and with the wider application by dispatching custom events:

```javascript
valuePropChanged(oldValue, newValue) {
  // Notify interested parties about the change
  this.dispatch('change', {
    detail: { oldValue, newValue },
    bubbles: true
  });
}
```

Listen for these events in other controllers or plain JavaScript:

```javascript
document.addEventListener('select:change', (event) => {
  console.log('Select changed:', event.detail);
});
```

The full options for `dispatch`:

```javascript
this.dispatch(
  eventType, // The event name suffix - e.g., "change"
  {
    target: this.element, // The target element, default is the host element
    prefix: this.identifier,   // Event name prefix, default is the controller-identifier
    detail: {},           // Event data
    bubbles: false,       // Whether the event bubbles
    cancelable: false,    // Whether the event can be canceled
    composed: false       // Whether the event crosses the shadow DOM boundary
  }
);
```

### Controller Communication Strategies

Controllers often need to communicate with each other in complex applications. Stim provides several patterns for this communication, each suited to different situations.

#### Choosing the Right Communication Strategy

| Strategy | Best For | 
|----------|----------|
| **Custom Events** | Loosely coupled components, application-wide notifications | 
| **Targets** | Parent-child or sibling relationships with direct references | 
| **Stim References** | Global services, singletons | 
| **Controller Injection** | Composing functionality on the same element | 

#### 1. Custom Events

Custom events enable loose coupling between controllers through a publish-subscribe pattern:

```javascript
export default class ProductConfigurator extends Controller {
  // Dispatch a custom event when a product is created
  productCreated(product) {
    this.dispatch('created', {
      detail: { product },
      target: document
    })
  }
}

export default class Cart extends Controller {
  // Listen for the custom event
  connected() {
    document.addEventListener('product-configurator:created', this.handleProductCreation);
  }
  // Clean up when disconnected
  disconnected() {
    document.removeEventListener('product-configurator:created', this.handleProductCreation);
  }
  handleProductCreation(event) {
    // Add the product to the cart
  }
}
```

**Best for**: Application-wide notifications, unrelated components that need to react to the same events

#### 2. Targets

Directly reference other controllers through DOM connections:

```html
<div data-controller="parent-component">
  <!-- Parent targets a child component -->
  <div data-controller="child-component" data-target="parent-component.child">
    <!-- Child component content -->
  </div>
</div>
```

```javascript
export default class ParentComponent extends Controller {
  static targets = ['child'];
  
  childTargetConnected(child) {
    // Get the child-component controller instance
    const childController = this.stim.getController(child, 'child-component');
    if (childController) {
      // Do something with the child controller
      childController.doSomething();
    }
  }
}
```

**Best for**: Parent-child relationships, tightly coupled components

#### 3. Stim References

Register controllers as global services accessible from anywhere:

```javascript
export default class Cart extends Controller {
  // Register the cart as a global reference during initialization
  connected() {
    this.stim.refs.set('cartController', this);
  }
  // Clean up when disconnected
  disconnected() {
    this.stim.refs.delete('cartController');
  }
  addProduct(product) {
    // Add the product to the cart
  }
}

export default class ProductConfigurator extends Controller {
  // Access the cart through the global reference
  productCreated(product) {
    const cartController = this.stim.refs.get('cartController');
    if (cartController) {
      cartController.addProduct(product);
    }
  }
}
```

**Best for**: Global services like cart, authentication, or analytics

#### 4. Controller Injection

Use controller injection for composition and communication between controllers on the same element:

```javascript
export default class ComboBox extends Controller {
  static targets = ['option']
  static injects = {
    'dropdown': {},
    'form-field': {}
  }

  connected() {
    // Access injected controllers directly
    if (this.formFieldInject.value) {
      this.dropdownInject.label = this.formFieldInject.value;
    }
	 
    // also possible: hook into injected controllers' callback methods
    formFieldInject.valuePropChanged = (oldValue, newValue) => {
      // if defined, call the original valuePropChanged method
      Object.getPrototypeOf(formFieldInject).valuePropChanged?.call(formFieldInject, oldValue, newValue);
      // additional logic
      this.dropdownInject.label = newValue;
    };
  }
  

  optionTargetConnected(option) {
    option.addEventListener('click', (event) => {
      this.formFieldInject.value = option.value;
      this.dropdownInject.toggle({}, event);
    });
  }
}
```

**Best for**: Composing functionality from multiple controllers on the same element

## Configuration Options

Customize Stim's behavior through configuration options:

```javascript
import { stim } from '@oliveoilexpert/stim';

// Configure Stim before connecting
stim.config.attributePrefix = 'data-';
stim.config.observeChildList = true;

// Start Stim
stim.connect();
```

#### Mutation Observers

* ##### `observeChildList`
  Default: `true`  
  Whether to observe the document body for new elements with `controller`, `target` and `action` attributes and connect them.

  ```javascript
  // Disable automatic observation for performance
  stim.config.observeChildList = false;
  ```

  Disabling this is useful if you want to optimize performance, but you'll have to manually connect dynamically added elements.

  Nodes can be connected/disconnected manually by calling `stim.connectElement(element)` and `stim.disconnectElement(element)` respectively.

* ##### `observeAttributes`

  Default: `true`  
  Whether to observe the document body for changes to the `controller`, `target` and `action` attributes on elements.

  ```javascript
  // Disable attribute observation
  stim.config.observeAttributes = false;
  ```

  Disabling this is useful if you want to optimize performance and are not expecting these attributes to change once elements have been added to the DOM.

* ##### `observeControllerAttributes`

  Default: `true`  
  Whether to observe attribute changes on controller elements.

  ```javascript
  // Disable controller attribute observation
  stim.config.observeControllerAttributes = false;
  ```

  If disabled:
  - Setting a controller prop property will still set the HTML attribute, but not vice versa
  - The `attributeChanged` callback will not trigger
  - The `[propName]PropChanged` callbacks will not trigger for HTML attribute changes

  Disabling this is useful if you do not need to change controller properties via HTML attributes.

#### Attribute Naming

* ##### `attributePrefix`

  Default: `data-`  
  The prefix for all HTML attributes. This can be changed to avoid conflicts with other libraries or frameworks.

  ```javascript
  // Use a different attribute prefix
  stim.config.attributePrefix = 'x-';
  ```

  With this change, you would use `x-controller` instead of `data-controller` in your HTML.

* ##### `controllerAttribute`

  Default: `controller`  
  The attribute that connects elements to controllers / instantiates controllers.

  ```javascript
  // Change the controller attribute name
  stim.config.controllerAttribute = 'uses';
  ```

  With this change, you would use `data-uses` instead of `data-controller` in your HTML.

* ##### `targetAttribute`

  Default: `target`  
  The attribute that connects elements as targets to controllers.

  ```javascript
  // Change the controller attribute name
  stim.config.controllerAttribute = 'ref';
  ```

  With this change, you would use `data-ref` instead of `data-target` in your HTML.

* ##### `actionAttribute`

  Default: `action`  
  The attribute that attaches event listeners to elements.

  ```javascript
  // Change the action attribute name
  stim.config.actionAttribute = 'triggers';
  ```

  With this change, you would use `data-triggers` instead of `data-action` in your HTML.


## Stim Syntax Cheat Sheet

### HTML Attributes

| Purpose | Syntax                                                             | Example                                          |
|---------|--------------------------------------------------------------------|--------------------------------------------------|
| Connect controller to element | `data-controller="controller-identifier"`                          | `<div data-controller="dropdown">`                  |
| Connect multiple controllers | `data-controller="controller1 controller2"`                        | `<div data-controller="dropdown list-filter">`      |
| Set controller prop | `data-[controller-identifier].[prop-name]="value"`                 | `<div data-dropdown.open="true">`                |
| Set multiple props | `data-[controller-identifier]='{"prop1": "val1", "prop2": "val2"}'` | `<div data-dropdown='{"open": true}'>`           |
| Target element to controller | `data-target="[controller-identifier].[targetType]"`               | `<button data-target="dropdown.button">`        |
| Remote target connection | `data-target="[controller-identifier].[targetType]#[id]"`          | `<button data-target="dropdown.button#menu">`   |
| Action with default event | `data-action="[controller-identifier].[methodName]"`               | `<button data-action="dropdown.toggle">`        |
| Action with specific event | `data-action="[event]->[controller-identifier].[method-name]"`     | `<button data-action="click->dropdown.toggle">` |