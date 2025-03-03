# Stim Guide

This guide provides a comprehensive explanation of Stim, taking you from the basics to advanced usage.

## Table of Contents

- [Introduction to Stim](#introduction-to-stim)
  - [What is Stim?](#what-is-stim)
  - [The Basic Pattern](#the-basic-pattern)
- [Getting Started](#getting-started)
  - [Creating Your First Aspect](#creating-your-first-aspect)
  - [Connecting Aspects to HTML](#connecting-aspects-to-html)
  - [Registering Aspects](#registering-aspects)
- [Core Features](#core-features)
  - [Attributes](#attributes)
  - [Lifecycle Methods](#lifecycle-methods)
  - [Connected Elements](#connected-elements)
  - [Handlers](#handlers)
- [Aspect Relationships & Scope](#aspect-relationships--scope)
  - [Scope and Remote Connections](#scope-and-remote-connections)
  - [Aspect Injection](#aspect-injection)
  - [Custom Events](#custom-events)
  - [Aspect Communication Strategies](#aspect-communication-strategies)
- [Configuration Options](#configuration-options)
- [Stim Syntax Cheat Sheet](#stim-syntax-cheat-sheet)

## Introduction to Stim

### What is Stim?

When dynamically updating the DOM via AJAX or libraries like HTMX and Turbo, you need a way to attach JavaScript behavior to new elements. Stim provides a structured approach to define and connect JavaScript behaviors to HTML elements.

> **🧠 Mental Model**: If you're familiar with other frameworks, Stim is like a lighter version of Stimulus. It focuses on adding behavior to existing HTML rather than taking over the rendering.


### The Basic Pattern

Stim follows a simple pattern:

1. You create **Aspects** (JavaScript classes)
2. You declare which **HTML elements** use those aspects by adding `data-connect` attributes
3. Stim looks for these attributes on existing and dynamically added elements and instantiates the corresponding aspects

## Getting Started

### Creating Your First Aspect

An aspect is a JavaScript class that adds behavior to an HTML element. Let's create a simple dropdown aspect:

```javascript
import { Aspect } from '@oliveoilexpert/stim';

export default class Dropdown extends Aspect {
  // Properties that sync with HTML attributes
  static attributes = {
    open: false
  };
  
  // Custom method to toggle the dropdown
  toggle() {
    // This will flip the open state
    this.open = !this.open;
  }
}
```

This simple aspect defines:
- An `open` attribute that defaults to `false`
- A `toggle()` method that flips the `open` state

### Connecting Aspects to HTML

To use an aspect, you connect it to an HTML element using the `data-connect` attribute:

```html
<div data-connect="dropdown" data-dropdown.open="true">
  <button>Toggle Menu</button>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

Here's what this HTML does:
- `data-connect="dropdown"` connects the `Dropdown` aspect to the `div`
- `data-dropdown.open="true"` changes the initial value of the `open` attribute

> **📝 Naming Convention**: HTML attributes for aspects use the format `data-[aspect-token].[attribute-name]`. The attribute name in HTML uses kebab-case (like `my-attribute`) to match the camelCase JavaScript property (like `myAttribute`).

One Element can use multiple aspects:

```html
<div data-connect="dropdown list-filter">
  <!-- This element uses both the dropdown and list-filter aspects -->
</div>
```


### Registering Aspects

Before Stim can use your aspects, you need to register them:

```javascript
import { stim } from '@oliveoilexpert/stim';
import Dropdown from './dropdown';

// Register the dropdown aspect
stim.registerAspect('dropdown', Dropdown);

// Start Stim (connect aspects to the DOM)
stim.connect();
```

You can also register multiple aspects at once:

```javascript
// Register multiple aspects with an object
stim.registerAspect({
  'dropdown': Dropdown,
  'list-filter': ListFilter
});

// Even shorter (token will be kebab-cased automatically)
stim.registerAspect({
   Dropdown,  // becomes 'dropdown'
   ListFilter // becomes 'list-filter'
});
```

> **📝 Naming Convention**: The aspect token (the string used to identify the aspect in HTML) is always kebab-case. When registering using the shorthand object notation, Stim will automatically convert class names to kebab-case.

Now our dropdown aspect is registered, but it doesn't actually do anything with the open state yet. Let's expand it to make it functional.

## Core Features

### Attributes

Attributes are properties that synchronize between your JavaScript and HTML. They serve as both state and configuration for your aspects.

> **🧠 Mental Model**: Think of attributes as 
> reactive properties that automatically stay in sync between your JavaScript code and the HTML DOM.

In our Dropdown example, we have an `open` attribute:

```javascript
static attributes = {
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
<div data-connect="my-aspect"
     data-my-aspect.count="42"           <!-- Becomes number 42 -->
     data-my-aspect.active="true"        <!-- Becomes boolean true -->
     data-my-aspect.tags='["a","b","c"]' <!-- Becomes array ["a", "b", "c"] -->
     data-my-aspect.config='{"key":"value"}' <!-- Becomes object {key: "value"} -->
</div>
```

For booleans, any value that is not exactly the string "false" or "0" is considered `true`.

When a property value equals its default value from `static attributes`, the HTML attribute is removed from the element.

#### Attribute Callbacks

You can define methods that are called when attributes change:

```javascript
// This is called when the 'open' attribute changes
openChanged(oldValue, newValue) {
  if (newValue) {
    // this.element is the host element, i.e. the element with data-connect
    this.element.classList.add('is-open');
  } else {
    this.element.classList.remove('is-open');
  }
}
```

The callback name follows the pattern `[attributeName]Changed`. It receives the old and new values as arguments.

For non-aspect attributes (HTML attributes not defined in your `static attributes`), you can use the general `attributeChanged` callback:

```javascript
// Called when any non-aspect attribute changes
attributeChanged(name, oldValue, newValue) {
  if (name === 'class') {
    // React to class changes
  }
}
```

#### Bulk Setting Attributes

Set multiple attributes at once using JSON:

```html
<!-- Bulk attribute setting -->
<div data-connect="dropdown" 
     data-dropdown='{"open": true, "animationDuration": 500}'>
</div>
```

This is equivalent to:

```html
<!-- Individual attribute setting -->
<div data-connect="dropdown" 
     data-dropdown.open="true"
     data-dropdown.animation-duration="500">
</div>
```

The bulk attribute is processed and then replaced with individual equivalents. If there's overlap between bulk and individual attributes, the individual attributes take precedence.

### Lifecycle Methods

Aspects have lifecycle methods that are called at specific moments:

```javascript
// Called when the aspect is instantiated
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

These lifecycle methods help you properly set up and clean up your aspects.

#### Lifecycle Sequence

When an element with a `data-connect` attribute is found in the DOM, Stim follows this sequence:

1. The aspect class is instantiated with the element as context
2. Default attribute values from `static attributes` are applied
3. Attributes from HTML are parsed and applied to the instance
4. Any injected aspects are instantiated (we'll cover this later)
5. The `initialized()` method is called
6. The `connected()` method is called
7. Connected elements are processed (we'll cover this next)

> **⚠️ Important**: The `initialized()` method is called before the aspect is connected to the DOM. This makes it ideal for operations that might cause DOM changes, like moving the element to a different parent. Doing such operations in `connected()` would trigger an additional disconnect/reconnect cycle.

#### Handling DOM Changes

When an element is removed from the DOM and then added back, the aspect instance is preserved. The lifecycle flow is:

1. Element is removed → `disconnected()` is called
2. Element is added back → `connected()` is called again

#### Cleaning Up Resources

It's essential to clean up any resources your aspect creates, particularly:

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

### Connected Elements

While we could use `querySelector` to find elements related to our aspect, Stim provides a better way: connected elements.

> **🧠 Mental Model**: Think of connected elements as named references to important parts of your UI. Instead of using `querySelector`, you're explicitly connecting elements to your aspect.

First, define the types of elements your aspect needs:

```javascript
export default class Dropdown extends Aspect {
  static attributes = {
    open: false
  };
  
  // Define the types of elements we want to connect
  // Note: Element types must use kebab-case
  static elements = ['toggle-button', 'menu'];
}
```

Then, connect those elements in HTML:

```html
<div data-connect="dropdown">
  <button data-connect="dropdown.toggle-button">Toggle</button>
  <ul data-connect="dropdown.menu">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

Now you can access those elements through properties:

- `this.toggleButtonElements` - A set containing all connected toggle-button elements
- `this.toggleButtonElement` - The first toggle-button element (convenience accessor)

> **📝 Naming Convention**: Element types in `static elements` must use kebab-case (like `toggle-button`), but they become camelCase properties in JavaScript (like `toggleButtonElement`).

You can also define callbacks for when elements are connected or disconnected:

```javascript
static elements = ['toggle-button', 'menu'];

// Called when a toggle-button element is connected
toggleButtonElementConnected(button) {
  button.addEventListener('click', () => this.toggle());
}

toggleButtonElementDisconnected(button) {
  // do stuff when the button is disconnected
}

// Called when a dropdown-menu element is connected
menuElementConnected(menu) {
  menu.hidden = !this.open;
}

// Called when the open attribute changes
openChanged(oldValue, newValue) {
  if (this.menuElement) {
    this.menuElement.hidden = !newValue;
  }
}

toggle() {
  this.open = !this.open;
}

```

> **⚠️ Important**: Connected elements are processed *after* the `connected()` lifecycle method. Don't try to access element collections like `this.toggleButtonElements` in your `connected()` method. Use the element-specific callbacks instead.

#### Multiple Connections on One Element

One element can have multiple connections:

```html
<div data-connect="fancy-button dropdown.toggle-button select.option">
  <!-- This element hosts the fancy-button aspect while connected 
       in multiple roles to other aspects -->
</div>
```

In the example above, the div:
1. Hosts the `fancy-button` aspect
2. Is connected as a `toggle-button` to a `dropdown` aspect
3. Is connected as an `option` to a `select` aspect

#### Dynamic Elements

Connected elements work with dynamic content. If elements are added or removed after the aspect is connected, the appropriate callbacks are called automatically:

```javascript
// Dynamically adding a connected element
addMenuItem(text) {
  const item = document.createElement('li');
  item.textContent = text;
  
  // Connect it as a menu-item
  item.dataset.connect = 'dropdown.menu-item';
  
  // Add it to the menu
  this.menuElement.appendChild(item);
  
  // menuItemElementConnected will be called automatically
}
```

### Handlers

While we can add event listeners in the element callbacks, Stim provides a more declarative way: handlers.

> **🧠 Mental Model**: Handlers are like event listeners declared in HTML. Instead of adding listeners in JavaScript, you specify them directly in your markup.

Basic handler syntax:

```html
<button data-handler="click->dropdown.toggle">Toggle Menu</button>
```

This tells Stim: "When this button is clicked, call the `toggle` method on the `dropdown` aspect."

For commonly used events, you can omit the event name:

```html
<!-- This also calls dropdown.toggle on click (default event for buttons) -->
<button data-handler="dropdown.toggle">Toggle Menu</button>
```

Let's update our dropdown example to use handlers:

```html
<div data-connect="dropdown">
  <button data-handler="dropdown.toggle">Toggle Menu</button>
  <ul data-connect="dropdown.menu">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

```javascript
export default class Dropdown extends Aspect {
  static attributes = {
    open: false
  };
  
  static elements = ['menu'];
  
  menuElementConnected(menu) {
    menu.hidden = !this.open;
  }
  
  openChanged(oldValue, newValue) {
    if (this.menuElement) {
      this.menuElement.hidden = !newValue;
    }
  }
  
  toggle() {
    this.open = !this.open;
  }
}
```

We've removed the need for the `toggleButtonElementConnected` method since we're using a handler instead.

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
<button data-handler="click[once prevent]->dropdown.toggle">
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

#### Passing Parameters to Handlers

You can pass parameters to handler methods:

```html
<button data-handler="dropdown.toggle" 
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

The handler method receives:
1. An object containing the parameters
2. The original DOM event

You can also set parameters in bulk using JSON:

```html
<button data-handler="dropdown.toggle" 
        data-dropdown.toggle='{"force": true, "animate": false}'>
  Force Open
</button>
```

#### Multiple Handlers on One Element

One element can have multiple handlers:

```html
<button data-handler="dropdown.toggle analytics.track-click">
  Multi-action Button
</button>
```

This will call both the `toggle` method on the `dropdown` aspect and the `trackClick` method on the `analytics` aspect when the button is clicked.

## Aspect Relationships & Scope

### Scope and Remote Connections

By default, Stim only looks for connected elements and handlers within their host element's DOM subtree, creating a scope boundary.

#### Default Scope Boundaries

Each aspect has a default scope limited to its host element's descendants:

```html
<!-- Default scope: Everything within this div -->
<div data-connect="dropdown">
  <!-- These are in scope for dropdown -->
  <button data-handler="dropdown.toggle">Toggle</button>
  <ul data-connect="dropdown.menu">...</ul>
</div>
```

Elements outside this scope are not automatically accessible:

```html
<!-- NOT in scope for dropdown, will not connect to aspect -->
<button data-handler="dropdown.toggle">Outside Toggle</button>
<ul data-connect="dropdown.menu">...</ul>

<div data-connect="dropdown">
  <!-- Content -->
</div>
```

When nesting aspects, each creates its own scope boundary:

```html
<div data-connect="dropdown">
  <div data-connect="list-filter">
    <!-- NOT in scope for dropdown -->
    <button data-handler="dropdown.toggle">Inner Toggle</button>
    <ul data-connect="dropdown.menu">...</ul>
  </div>
</div>
```

#### Remote Connections

To connect elements across scope boundaries, use element IDs:

```html
<!-- Remote connection using ID -->
<button data-connect="modal.toggle-button#login-modal">Show Login</button>

<!-- Target element with matching ID -->
<div id="login-modal" data-connect="modal">...</div>
```

Remote connections also work for handler elements:

```html
<!-- Remote connection using ID -->
<button data-handler="modal.show#login-modal">Show Login</button>

<!-- Target element with matching ID -->
<div id="login-modal" data-connect="modal">...</div>
```

### Aspect Injection

Aspect injection lets one aspect use another aspect's functionality. This encourages composition over inheritance.

> **🧠 Mental Model**: Think of aspect injection as a way to say "my aspect needs the functionality of these other aspects" without having to extend them.

```javascript
export default class Select extends Aspect {
  // Inject the dropdown and form-field aspects
  // Note: Aspect tokens must use kebab-case
  static aspects = ['dropdown', 'form-field'];
  
  static elements = ['option']
  
  optionElementConnected(option) {
    option.addEventListener('click', (event) => {
      // access injected aspects directly
      this.formFieldAspect.value = option.value;
      this.dropdownAspect.toggle({}, event);
    });
  }
}
```

> **📝 Naming Convention**: Aspect tokens in `static aspects` must use kebab-case (like `form-field`), but they become camelCase properties in JavaScript (like `formFieldAspect`).

> **⚠️ Important**: Directly calling lifecycle methods of injected aspects is *not* recommended, as they are only callbacks for the aspect's lifecycle managed by Stim. Calling them will *not* trigger the lifecycle itself.

When a `Select` aspect is instantiated, Stim will:
1. Create a `Dropdown` aspect on the same element
2. Create a `FormField` aspect on the same element
3. Make them available as `this.dropdownAspect` and `this.formFieldAspect`

This is powerful for building complex components from smaller, reusable parts.

#### Injected Aspects in HTML

Injected aspects' attributes, connected elements and handlers are set up just like they are for "normal" aspects:

```html
<!-- Select aspect with injected dropdown and form-field aspects -->
<!-- data-form-field.validation and data-dropdown set attributes on the injected aspects -->
<div data-connect="select" 
     data-form-field.validation="..." 
     data-dropdown='{ "open": true }'>
  <!-- data-connect="form-field.input" declares a connected element of the injected form-field aspect -->
  <input data-connect="form-field.input" type="hidden"/>
  <!-- data-handler="dropdown.toggle" declares a handler of the injected dropdown aspect -->
  <button data-handler="dropdown.toggle">Open Options</button>
  <ul data-connect="dropdown.menu">
    <li data-connect="select.option" value="1">Option 1</li>
    <li data-connect="select.option" value="2">Option 2</li>
  </ul>
```


#### Configuring Injected Aspects

You can configure injected aspects by using an object instead of an array:

```javascript
static aspects = {
  'dropdown': {
    open: true,
  },
  'form-field': {
    validation: { ... },  
  }
};
```

These values override the default values from the injected aspects' `static attributes`.

### Custom Events

Aspects can communicate with each other and with the wider application by dispatching custom events:

```javascript
valueChanged(oldValue, newValue) {
  // Notify interested parties about the change
  this.dispatch('change', {
    detail: { oldValue, newValue },
    bubbles: true
  });
}
```

Listen for these events in other aspects or plain JavaScript:

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
    prefix: this.token,   // Event name prefix, default is the aspect-token
    detail: {},           // Event data
    bubbles: false,       // Whether the event bubbles
    cancelable: false,    // Whether the event can be canceled
    composed: false       // Whether the event crosses the shadow DOM boundary
  }
);
```

### Aspect Communication Strategies

Aspects often need to communicate with each other in complex applications. Stim provides several patterns for this communication, each suited to different situations.

#### Choosing the Right Communication Strategy

| Strategy | Best For | 
|----------|----------|
| **Custom Events** | Loosely coupled components, application-wide notifications | 
| **Connected Elements** | Parent-child or sibling relationships with direct references | 
| **Stim References** | Global services, singletons | 
| **Aspect Injection** | Composing functionality on the same element | 

#### 1. Custom Events

Custom events enable loose coupling between aspects through a publish-subscribe pattern:

```javascript
export default class ProductConfigurator extends Aspect {
  // Dispatch a custom event when a product is created
  productCreated(product) {
    this.dispatch('created', {
      detail: { product },
      target: document
    })
  }
}

export default class Cart extends Aspect {
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

#### 2. Connected Elements

Directly reference other aspects through DOM connections:

```html
<div data-connect="parent-component">
  <!-- Parent connects to a child component -->
  <div data-connect="child-component" data-connect="parent-component.child">
    <!-- Child component content -->
  </div>
</div>
```

```javascript
export default class ParentComponent extends Aspect {
  static elements = ['child'];
  
  childElementConnected(child) {
    // Get the child-component aspect instance
    const childAspect = this.stim.getAspect(child, 'child-component');
    if (childAspect) {
      // Do something with the child aspect
      childAspect.doSomething();
    }
  }
}
```

**Best for**: Parent-child relationships, tightly coupled components

#### 3. Stim References

Register aspects as global services accessible from anywhere:

```javascript
export default class Cart extends Aspect {
  // Register the cart as a global reference during initialization
  connected() {
    this.stim.refs.set('cartAspect', this);
  }
  // Clean up when disconnected
  disconnected() {
    this.stim.refs.delete('cartAspect');
  }
  addProduct(product) {
    // Add the product to the cart
  }
}

export default class ProductConfigurator extends Aspect {
  // Access the cart through the global reference
  productCreated(product) {
    const cartAspect = this.stim.refs.get('cartAspect');
    if (cartAspect) {
      cartAspect.addProduct(product);
    }
  }
}
```

**Best for**: Global services like cart, authentication, or analytics

#### 4. Aspect Injection

Use aspect injection for composition and communication between aspects on the same element:

```javascript
export default class ComboBox extends Aspect {
  static elements = ['option']
  static aspects = ['dropdown', 'form-field'];

  connected() {
    // Access injected aspects directly
    if (this.formFieldAspect.value) {
      this.dropdownAspect.label = this.formFieldAspect.value;
    }
	 
    // also possible: hook into injected aspects' callback methods
    formFieldAspect.valueChanged = (oldValue, newValue) => {
      // if defined, call the original valueChanged method
      Object.getPrototypeOf(formFieldAspect).valueChanged?.call(formFieldAspect, oldValue, newValue);
      // additional logic
      this.dropdownAspect.label = newValue;
    };
  }
  

  optionElementConnected(option) {
    option.addEventListener('click', (event) => {
      this.formFieldAspect.value = option.value;
      this.dropdownAspect.toggle({}, event);
    });
  }
}
```

**Best for**: Composing functionality from multiple aspects on the same element

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
  Whether to observe the document body for new elements with `connect` and `handler` attributes and connect them.

  ```javascript
  // Disable automatic observation for performance
  stim.config.observeChildList = false;
  ```

  Disabling this is useful if you want to optimize performance, but you'll have to manually connect dynamically added elements.
  
  Nodes can be connected/disconnected manually by calling `stim.connectNode(node)` and `stim.disconnectNode(node)` respectively.

* ##### `observeAttributes`

  Default: `true`  
  Whether to observe the document body for changes to the `connect` and `handler` attributes on elements.
  
  ```javascript
  // Disable attribute observation
  stim.config.observeAttributes = false;
  ```
  
  Disabling this is useful if you want to optimize performance and are not expecting the `connect` and `handler` attributes to change once elements have been added to the DOM.

* ##### `observeAspectAttributes`

  Default: `true`  
  Whether to observe attribute changes on aspect elements.
  
  ```javascript
  // Disable aspect attribute observation
  stim.config.observeAspectAttributes = false;
  ```

  If disabled:
  - Setting an aspect attribute property will still set the HTML attribute, but not vice versa
  - The `attributeChanged` callback will not trigger
  - The `[attributeName]Changed` callbacks will not trigger for HTML attribute changes
  
  Disabling this is useful if you do not need to change aspect properties via HTML attributes.

#### Attribute Naming

* ##### `attributePrefix`
  
  Default: `data-`  
  The prefix for all HTML attributes. This can be changed to avoid conflicts with other libraries or frameworks.
  
  ```javascript
  // Use a different attribute prefix
  stim.config.attributePrefix = 'x-';
  ```
  
  With this change, you would use `x-connect` instead of `data-connect` in your HTML.

* ##### `connectAttribute`
  
  Default: `connect`  
  The attribute that connects elements to aspects / instantiates aspects.
  
  ```javascript
  // Change the connect attribute name
  stim.config.connectAttribute = 'is';
  ```
  
  With this change, you would use `data-is` instead of `data-connect` in your HTML.

* ##### `handlerAttribute`
  
  Default: `handler`  
  The attribute that attaches event listeners to elements.
  
  ```javascript
  // Change the handler attribute name
  stim.config.handlerAttribute = 'trigger';
  ```
  
  With this change, you would use `data-trigger` instead of `data-handler` in your HTML.

* ##### `scopeAttribute`
  
  Default: `scope`  
  The attribute that defines the scope of an aspect (internal functionality).
  
  ```javascript
  // Change the scope attribute name
  stim.config.scopeAttribute = 'context';
  ```

#### Custom Elements

* ##### `customElementPrefix`
  
  Default: `aspect-`  
  The prefix for custom elements.
  
  ```javascript
  // Change the custom element prefix
  stim.config.customElementPrefix = 'stim-';
  
  // Register a custom element
  stim.registerCustomElement('dropdown');
  ```
  
  This allows you to use custom elements with your aspects:
  
  ```html
  <!-- With default prefix -->
  <aspect-dropdown>
    <button data-connect="dropdown.toggle-button">Toggle</button>
  </aspect-dropdown>
  
  <!-- With custom prefix -->
  <stim-dropdown>
    <button data-connect="dropdown.toggle-button">Toggle</button>
  </stim-dropdown>
  ```

## Stim Syntax Cheat Sheet

### HTML Attributes

| Purpose | Syntax | Example                                          |
|---------|--------|--------------------------------------------------|
| Connect aspect to element | `data-connect="aspect-name"` | `<div data-connect="dropdown">`                  |
| Connect multiple aspects | `data-connect="aspect1 aspect2"` | `<div data-connect="dropdown list-filter">`      |
| Set aspect attribute | `data-[aspect-name].[attribute-name]="value"` | `<div data-dropdown.open="true">`                |
| Set multiple attributes | `data-[aspect-name]='{"attr1": "val1", "attr2": "val2"}'` | `<div data-dropdown='{"open": true}'>`           |
| Connect element to aspect | `data-connect="[aspect-name].[element-type]"` | `<button data-connect="dropdown.button">`        |
| Remote element connection | `data-connect="[aspect-name].[element-type]#[id]"` | `<button data-connect="dropdown.button#menu">`   |
| Handler with default event | `data-handler="[aspect-name].[method-name]"` | `<button data-handler="dropdown.toggle">`        |
| Handler with specific event | `data-handler="[event]->[aspect-name].[method-name]"` | `<button data-handler="click->dropdown.toggle">` |
| Handler parameter | `data-[aspect-name].[method-name].[param-name]="value"` | `<button data-dropdown.toggle.force="true">`     |

### JavaScript API

| Purpose | Syntax | Example                                       |
|---------|--------|-----------------------------------------------|
| Define aspect | `class Name extends Aspect` | `class Dropdown extends Aspect`               |
| Define attributes | `static attributes = {...}` | `static attributes = { open: false }`         |
| Define element types | `static elements = [...]` | `static elements = ['toggle-button', 'menu']` |
| Inject aspects | `static aspects = [...]` | `static aspects = ['dropdown']`               |
| Register aspect | `stim.registerAspect(name, Class)` | `stim.registerAspect('dropdown', Dropdown)`   |
| Start Stim | `stim.connect()` | `stim.connect()`                              |