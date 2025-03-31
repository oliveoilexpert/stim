# Stim

A lightweight, flexible alternative to [Stimulus](https://github.com/hotwired/stimulus) for adding JavaScript behavior to HTML.

![npm bundle size](https://img.shields.io/bundlephobia/minzip/@oliveoilexpert/stim@latest)
![npm version](https://img.shields.io/npm/v/@oliveoilexpert/stim)

## Table of Contents

- [Quick Start](#quick-start)
- [What Problem Does Stim Solve?](#what-problem-does-stim-solve)
- [Key Features](#key-features)
- [Controller Example](#controller-example)
- [Documentation](#documentation)

## Quick Start

```bash
npm install @oliveoilexpert/stim
```

```javascript
// Define a controller
import { Controller, stim } from '@oliveoilexpert/stim';

class Dropdown extends Controller {
  static props = {
    open: false
  }

  connected() {
    this.element.addEventListener('click', () => {
      this.open = !this.open;
    })
  }
}

// Register and start
stim.registerController('dropdown', Dropdown);
stim.connect();
```

```html
<!-- Attach to HTML -->
<div data-controller="dropdown">
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

1. You create **Controllers** (JavaScript classes)
2. You declare which **HTML elements** use those controllers by adding `data-controller` attributes
3. Stim looks for these attributes on existing and dynamically added elements and instantiates the corresponding controllers

### Why Stim over Alternatives?

#### Compared to Custom Elements

- An element can use multiple controllers rather than being limited to just one class
- No conflicts with built-in properties or future HTML standards
- Extending standard elements is possible with full browser support without the limitations of the `is` attribute
- Compose behaviors by injecting controllers into one another
- Additional features like targets and actions

>Stim can be used supplementary to custom elements, adding reusable behaviors (like scroll reveal, conditional display etc.) to standard elements and custom elements that define the core functionality of a component.

#### Compared to Stimulus

- **Lighter weight**: ~3kb vs ~11kb minified
- **More flexible connections**: Targets/Actions can connect "remotely" to controllers via ID
- **Dependency injection**: Controllers can inject other controllers they depend on
- **Props bulk attribute**: Set props in bulk with JSON
- **Configurable**: Options to disable mutation observers when not needed
- **More readable attribute syntax**:
  - `data-filter-list.category-state="value"` instead of `data-filter-list-category-state-value="value"`
  - `data-target="dropdown.item select.option"` instead of `data-dropdown-target="item" data-select-target="option"`

## Key Features

- **Controllers**: JavaScript classes that add behavior to HTML elements
- **Prop Binding**: Two-way binding between JavaScript properties and HTML attributes
- **Targets**: Direct access to related DOM elements
- **Actions**: Declarative event handling with parameter passing
- **Controller Injection**: Compose behaviors by injecting controllers into one another
- **Remote Connections**: Connect Targets/Actions across the DOM without nesting
- **Lifecycle Methods**: Structured callbacks for initialization and cleanup

## Controller Example

Here's a simple dropdown that shows key Stim features:

```javascript
// dropdown.js
import { Controller } from '@oliveoilexpert/stim';

export default class Dropdown extends Controller {
  // Define properties that sync with HTML attributes
  static props = {
    open: false  // Tracks open state with data-dropdown.open
  };
  
  // Define types of elements that can connect to this controller
  static targets = ['button', 'menu'];
  
  // Called when the controller is connected
  connected() {
    // host element is available as this.element
    this.element.setAttribute('role', 'menu');
  }
  
  // Called when a button target is connected
  buttonTargetConnected(button) {
    // Initialize the button's state
    button.setAttribute('aria-expanded', this.open);
    
    // Add click handler directly to the button
    button.addEventListener('click', () => {
      this.open = !this.open; // Toggle state
    });
  }
  
  // Called when a menu target is connected
  menuTargetConnected(menu) {
    // Initialize menu visibility based on current state
    menu.hidden = !this.open;
  }
  
  // Called when the 'open' prop/property changes
  openPropChanged(oldValue, newValue) {
    // Update targets when state changes
    this.buttonTargets.forEach(btn => {
        btn.setAttribute('aria-expanded', newValue);
    });

    if (this.menuTarget) {
        this.menuTarget.hidden = !newValue;
    }
  }
}
```

```html
<!-- Connecting a controller and setting props on the host element -->
<!-- data-dropdown.open="true" sets an initial state different from the default -->
<div data-controller="dropdown" data-dropdown.open="true">
  
  <!-- Target button element - will toggle dropdown when clicked -->
  <button data-target="dropdown.button">Menu</button>
  
  <!-- Target menu element - will be hidden when open=false -->
  <div data-target="dropdown.menu">
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