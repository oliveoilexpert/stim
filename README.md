# Stim

A lightweight, flexible alternative to [Stimulus](https://github.com/hotwired/stimulus) for adding JavaScript behavior to HTML.

![npm bundle size](https://img.shields.io/bundlephobia/minzip/@oliveoilexpert/stim)
![npm version](https://img.shields.io/npm/v/@oliveoilexpert/stim)

## Table of Contents

- [Quick Start](#quick-start)
- [What Problem Does Stim Solve?](#what-problem-does-stim-solve)
- [Key Features](#key-features)
- [Aspect Example](#aspect-example)
- [Documentation](#documentation)

## Quick Start

```bash
npm install @oliveoilexpert/stim
```

```javascript
// Define an aspect
import { Aspect, stim } from '@oliveoilexpert/stim';

class Dropdown extends Aspect {
  static attributes = {
    open: false
  }

  connected() {
    this.element.addEventListener('click', () => {
      this.open = !this.open;
    })
  }
}

// Register and start
stim.registerAspect('dropdown', Dropdown);
stim.connect();
```

```html
<!-- Attach to HTML -->
<div data-connect="dropdown">
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
```

## What Problem Does Stim Solve?

Stim provides a structured way to define and connect JavaScript behaviors to HTML.

Especially when dynamically updating the DOM via AJAX or libraries like [HTMX](https://github.com/bigskysoftware/htmx) and [Turbo](https://github.com/hotwired/turbo), it's nice to have HTML elements that automatically adopt JavaScript behaviors, similar to how custom elements work.

Stim follows a simple pattern:

1. You create **Aspects** (JavaScript classes)
2. You declare which **HTML elements** use those aspects by adding `data-connect` attributes
3. Stim looks for these attributes on existing and dynamically added elements and instantiates the corresponding aspects

### Why Stim over Alternatives?

#### Compared to Custom Elements

- An element can use multiple aspects rather than being limited to just one class
- No conflicts with built-in properties or future HTML standards
- Extending standard elements is possible with full browser support without the limitations of the `is` attribute
- Compose behaviors by injecting aspects into one another
- Additional features like connected elements and handlers

>Stim can be used supplementary to custom elements, adding reusable behaviors (like scroll reveal, conditional display etc.) to standard elements and custom elements that define the core functionality of a component.

#### Compared to Stimulus

- **Lighter weight**: ~4kb vs ~11kb minified
- **More flexible connections**: Elements can connect "remotely" to aspects via ID
- **Dependency injection**: Aspects can inject other aspects they depend on
- **JSON attributes**: Set attributes in bulk with JSON
- **Configurable**: Options to disable mutation observers when not needed
- **More readable attribute syntax**:
    - `data-filter-list.category-state="value"` instead of `data-filter-list-category-state-value="value"`
    - `data-connect="dropdown.item select.option"` instead of `data-dropdown-target="item" data-select-target="option"`
  
## Key Features

- **Aspects**: JavaScript classes that add behavior to HTML elements
- **Attribute Binding**: Two-way binding between JavaScript properties and HTML attributes
- **Connected Elements**: Direct access to related DOM elements
- **Event Handlers**: Declarative event handling with parameter passing
- **Aspect Injection**: Compose behaviors by injecting aspects into one another
- **Remote Connections**: Connect elements across the DOM without nesting
- **Lifecycle Methods**: Structured callbacks for initialization and cleanup

## Aspect Example

Here's a simple dropdown that shows key Stim features:

```javascript
// dropdown.js
import { Aspect } from '@oliveoilexpert/stim';

export default class Dropdown extends Aspect {
  // Define properties that sync with HTML attributes
  static attributes = {
    open: false  // Tracks open state with data-dropdown.open
  };
  
  // Define types of elements that can connect to this aspect
  static elements = ['button', 'menu'];
  
  // Called when the aspect is connected
  connected() {
    // host element is available as this.element
    this.element.setAttribute('role', 'menu');
  }
  
  // Called when a button element is connected
  buttonElementConnected(button) {
    // Initialize the button's state
    button.setAttribute('aria-expanded', this.open);
    
    // Add click handler directly to the button
    button.addEventListener('click', () => {
      this.open = !this.open; // Toggle state
    });
  }
  
  // Called when a menu element is connected
  menuElementConnected(menu) {
    // Initialize menu visibility based on current state
    menu.hidden = !this.open;
  }
  
  // Called when the 'open' attribute/property changes
  openChanged(oldValue, newValue) {
    // Update connected elements when state changes
    this.buttonElements.forEach(btn => {
        btn.setAttribute('aria-expanded', newValue);
    });

    if (this.menuElement) {
        this.menuElement.hidden = !newValue;
    }
  }
}
```

```html
<!-- Connecting an aspect and setting attributes on the host element -->
<!-- data-dropdown.open="true" sets an initial state different from the default -->
<div data-connect="dropdown" data-dropdown.open="true">
  
  <!-- Connected button element - will toggle dropdown when clicked -->
  <button data-connect="dropdown.button">Menu</button>
  
  <!-- Connected menu element - will be hidden when open=false -->
  <div data-connect="dropdown.menu">
    <ul>
      <li><a href="#">Option 1</a></li>
      <li><a href="#">Option 2</a></li>
    </ul>
  </div>
</div>
```

## Documentation

- [**Guide**](./docs/guide.md): Detailed explanations of all core concepts
- [**API Reference**](./docs/api-reference.md): Complete reference for all properties and methods
