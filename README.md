# nexus

### A modest stimulus knock-off

This is basically a lightweight and less opinionated (differently opinionated?) version
of [stimulus](https://github.com/hotwired/stimulus).

## What problem does it solve?

When dynamically updating the DOM via AJAX / libraries like [HTMX](https://github.com/bigskysoftware/htmx) and [hotwired/turbo](https://github.com/hotwired/turbo), you often need to attach JavaScript behavior to the new elements that are added to the page.
This is where nexus comes in. It allows you to
define JavaScript classes that can be attached to elements via HTML attributes and gives you a structured way to define behaviors, similar to custom elements.

### Why not just use custom elements?

Custom elements do solve that problem, however I have a few issues with them:

1. an element can only have one custom behavior (one JavaScript class) attached to it. It does not <em>use</em> the
   class, it <em>is</em> the class, forcing inheritance and making it harder to compose behaviors
2. the `is` attribute is not supported in all browsers, so you cannot extend built-in elements like `<button>` with full
   browser support
3. when defining properties on custom element classes, it is easy to accidentally "overwrite" or misuse built-in
   properties. Or worse, an attribute you defined might later become standard, causing conflicts

### Why not just use stimulus?

tbh, might as well. Stim really is just the cheap knock-off.
However, there are some key differences. Skip this section if you're not familiar with stimulus anyway.

First we need to define some terms:

| Stimulus feature | Equivalent in Stim |
|------------------|---------------------|
| Controller       | Aspect              |
| Action           | Handler             |
| Targets          | Elements            |
| Values           | Attributes          |


Here are some differences:

1. nexus is more lightweight, ~5kb instead of ~11kb minified
2. handler and connected elements do not have to be descendants of the aspect element, connecting them "remotely" via id is possible
3. aspects can inject other aspects they depend on and instantiate them on their host element, making it easier to avoid
   inheritance
4. class and attribute names are more vanilla JavaScript-like, at least in my opinion
5. aspect/handler-specific attributes are unambiguous and easier to read, e.g. `data-filter-list.category-state="value"` instead
   of `data-filter-list-category-state-value="value"`. It's also possible to set attributes in bulk with JSON, e.g. `data-filter-list='{"category-state":"value", "search-term":"term"}'`
6. no dedicated "classes" attributes/properties as aspect attributes already cover this functionality
7. no "outlets", similar functionality can be achieved with remotely connected elements
7. config options to disable mutation observers for setups where they're not needed

## How does it work?

If you're familiar with stimulus, you'll feel right at home. If not, here's a quick rundown:

### Define an aspect

```javascript
import {Aspect} from 'Stim';

export default class Dropdown extends Aspect {
    static attributes = {
        open: false
    }

    toggle() {
        this.open = !this.open;
    }

    connected() {
        this.element.addEventListener('click', () => this.toggle());
    }
}
```

### Register the aspect and start nexus

```javascript
import {nexus} from 'Stim';
import Dropdown from './Dropdown';

nexus.registerAspect('dropdown', Dropdown);
nexus.connect();
```

### Attach the aspect to an element

```html
<div data-connect="dropdown">
    Menu
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
    </ul>
</div>
```
When the div is clicked, the `open` property on the aspect will change, and with it the `dropdown.open` attribute on the div:
```html
<div data-connect="dropdown" 
     data-dropdown.open>
```

### Lifecycle

The `connected()` and `disconnected()` methods are comparable to the `connectedCallback()` and `disconnectedCallback()` lifecycle methods in [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).

When an element with `data-connect="[...aspect-names]"` is added to the DOM, a new aspect instance is created for each valid token before calling the `initialized()` and `connected()` methods on each instance in that order. 

Example:
```html
<div data-connect="dropdown filter-list">
```
will create an instance of the `Dropdown` and `FilterList` aspects on the element.

When an element is removed from the DOM, the `disconnected()` method is called on all its aspects. 

If the element is added back to the DOM, the `connected()` methods will be called again.

Additionally, if the `data-connect` attribute is changed or removed, new aspects are instantiated and connected, or existing aspects are disconnected.


### Attributes
Properties defined in the static property `attributes` sync instance properties with HTML attributes, e.g. `data-dropdown.open` on the element equals `this.open` in the aspect. The aspect will automatically update the property when the attribute changes and vice versa. 

Note: Instance properties are in camelCase, while HTML attributes are kebab-case. `this.myProperty` in the dropdown aspect corresponds to `data-dropdown.my-property` on the element.

When reading an attribute value, `JSON.parse` is used to convert it to the correct type, so you can use strings, numbers, booleans, arrays and objects. For booleans, any value that is not the string "false" or "0" is considered true.

When the current value of a property is equal to the default value, the HTML attribute on the element is removed.

For every attribute, you can define a callback method `[attributeName]Changed(oldValue, newValue)` that is called when the attribute changes.

Additionally, when any HTML attribute on the element changes that is NOT part of your aspect attributes, the method `attributeChanged` is called with the attribute name, old value and new value as arguments.

```javascript
export default class Dropdown extends Aspect {
    static attributes = {
        open: false,
    }
    openChanged(oldValue, newValue) {
        console.log(`open changed from ${oldValue} to ${newValue}`);
    }
    attributeChanged(name, oldValue, newValue) {
        console.log(`${name} changed from ${oldValue} to ${newValue}`);
    }
}
```

Attributes can also be set in bulk with `data-[aspect-name]='{jsonString}'`:
```html
<div data-connect="dropdown" 
     data-dropdown='{"open": true, "color": "red"}'>
```
This can be a relief when templating with a backend language, as you can just `json_encode` an array of attributes.
The bulk attribute will set all individual attributes and then be removed.
When you mix individual and bulk attributes, the individual attributes will take precedence.

### Using handlers
As it stands now, our dropdown kinda sucks. Clicking any part of it will trigger the toggle. Let's add a button with an event <b>handler</b> instead.

```html
<div data-connect="dropdown">
    <button data-handler="click->dropdown.toggle">Menu</button>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
    </ul>
</div>
```
`click`ing on the button will trigger the `toggle` method on the `dropdown` aspect. The syntax is `[event]->[aspect].[method]`. 
As `click` is the "default event" for buttons, it can be omitted:
```html
<button data-handler="dropdown.toggle">Menu</button>
```
The default events for HTML elements are:

| Element               | Default event |
|-----------------------|---------------|
| input                 | input         |
| input (type="submit") | click         |
| textarea              | input         |
| select                | change        |
| form                  | submit        |
| details               | toggle        |
| everything else       | click         |




If your handler element is not a descendant of the aspect element, you can specify the corresponding element with its id instead:
```html
<button data-handler="dropdown.toggle#e235">Menu</button>
<div data-connect="dropdown" id="e235">
```
We can also define options for our event listener:
```html
<button data-handler="click[once !passive]->dropdown.toggle">Menu</button>
```
This will result in something like:
```javascript
handlerElement.addEventListener('click', aspect.toggle, {once: true, passive: false});
```
In addition to `once`, `passive` and `capture`, you can also specify `prevent` and `stop`, which will call `event.preventDefault()` and `event.stopPropagation()` respectively (before calling the method).

What if our method needs parameters, or we want to pass the event object?
```javascript
export default class Dropdown extends Aspect {
    
    toggle({setClass = ''}, event) {
        this.open = !this.open;
        console.log(event.target);
        
        if (setClass) {
            this.element.classList.toggle(setClass);
        }
    }
}
```
```html
<button data-handler="dropdown.toggle" 
        data-dropdown.toggle.set-class="-active">Menu</button>
```
Handlers call methods with its parameters as the first argument, and the event object as the second argument. It is highly recommended to use a destructured parameters object with default values.

### Using connected elements

Instead of using a handler, we might also want to connect our button directly with our dropdown aspect. This is useful if we want to change an attribute on the button when the dropdown is open, for example.

First, we define the connected element type with the static property `elements`. Then, we define a method `[connectedElementType]ElementConnected` that is called when a connected element is added to the DOM.
The connected elements are accessible via `this.[connectedElementType]Elements`, the first connected element of a a type via `this.[connectedElementType]Element`.
```javascript
export default class Dropdown extends Aspect {
    static attributes = {
        open: false
    }
    static elements = ['button'];
    
    toggle() {
        this.open = !this.open;
        this.buttonElements.forEach(el => {
           el.setAttribute('aria-expanded', this.open)
        });
    }

    buttonElementConnected(el) {
        el.addEventListener('click', () => this.toggle());
        el.setAttribute('aria-expanded', this.open);
    }
    
    connected() {}
}
```
We connect our HTML element to the aspect with `data-connect="[aspect-name].[connected-element-type]"`.
```html
<div data-connect="dropdown">
    <button data-connect="dropdown.button">Menu</button>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
    </ul>
</div>
```
Similarly to handlers, we can specify the aspect element with its id if the connected element is not a descendant:
```html
<button data-connect="dropdown.button#e235">Menu</button>
<div data-connect="dropdown" id="e235">
```

### Injecting aspects

Some aspects need behavior that is already defined on other aspects. For example, a `select` might depend on a `dropdown` aspect to toggle its visibility. Instead of extending the `dropdown` aspect, we can inject it into the `select` aspect:

```javascript
export default class Select extends Aspect {
    static aspects = ['dropdown'];
    connected() {
        console.log(this.dropdownAspect.element === this.element);
        // true
    }
}
```

The injected aspect is instantiated on the host element and can be accessed via `this.[aspectName]Aspect`.

### Bringing it together

Let's use the features we've learned so far to create a usable select aspect that will use the dropdown aspect, work with `<form>` elements, and add some aria roles.

```javascript
export default class Select extends Aspect {
    static attributes = {
        value: '',
    }
    static elements = ['input', 'option'];
    static aspects = ['dropdown'];
    
    valueChanged(oldValue, newValue) {
        this.inputElement.value = newValue;
        this.dropdownAspect.buttonElement.textContent = newValue || 'Please choose';
    }
    
    optionElementConnected(option) {
       option.role = 'option';
       option.addEventListener('click', () => {
            this.value = option.getAttribute('value');
            this.dropdownAspect.toggle();
        });
    }
    
    connected() {
        this.element.role = 'listbox';
    }
}
```
```html
<div data-connect="select">
    <button data-connect="dropdown.button">Please choose</button>
    <ul>
        <li data-connect="select.option" value="Mazda">Mazda</li>
        <li data-connect="select.option" value="Toyota">Toyota</li>
    </ul>
   <input data-connect="select.input" type="hidden" name="car" required>
</div>
```


## API

### Aspect

#### Static properties

#### `static attributes`

An object that defines the aspect's attributes and their default values. The HTML attributes are synced with aspect instance properties, i.e. `data-[aspect-name].[attribute-name]` is mapped to `aspectInstance.[attributeName]`. The aspect will automatically update the property when the attribute changes and vice versa.

#### `static elements`

An array of strings that defines different types of elements that can be connected to this aspect. The connected elements are attached to the aspect in HTML via `data-connect="[aspect-name].[connected-element-type]"`. The aspect can access the connected elements via `this.[connectedElementType]Elements` and `this.[connectedElementType]Element`, and callback methods are called when a connected element is added or removed.

#### `static aspects`

An array of strings or object that defines the aspects that this aspect depends on. The aspects will be instantiated on the host element and can be accessed via `this.[aspectName]Aspect`. If defined as an object, the key is the name of the injected aspect and the value overrides its default attribute values.

<br>

#### Static callback methods

#### `shouldRegister()`

Called before the aspect is registered with `nexus.registerAspect()`. If the method returns false, the aspect is not registered.

#### `registered()`

Called after the aspect is registered with `nexus.registerAspect()`.

<br>

#### Properties / Getters

#### `element`

The host element, i.e. the element with the `data-connect` attribute that instantiated the aspect.

#### `[attributeName]`

Instance property synced with `data-[aspect-name].[attribute-name]` on the host element via the `static attributes` object.


#### `[aspectName]Aspect`

The injected aspect with the name `[aspectName]`.

#### `[connectedElementType]Elements`

A set of connected elements of type `[connectedElementType]`.

#### `[connectedElementType]Element`

The first connected element of type `[connectedElementType]`.

<br>

#### Callback methods

#### `initialized()`

Called when the aspect is instantiated on the host element, before `connected()`.

#### `connected()`

Called when an element with `data-connect="[aspect-name]"` ("host element") is added to the DOM.

#### `disconnected()`

Called when the host element is removed from the DOM.

#### `[connectedElementType]ElementConnected(el)`

Called when an element with `data-connect="[aspect-name].[connected-element-type]"` is added to the DOM.

#### `[connectedElementType]ElementDisconnected(el)`

Called when the connected element is removed from the DOM.

#### `[attributeName]Changed(oldval, newval)`

Called when the property `[attributeName]` (and, because of syncing, the HTML attribute `data-[aspect-name].[attribute-name]`) changes.

<br>

### nexus

#### `registerAspect(aspectName, Aspect)`

Register an aspect with nexus.

#### `connect()`

Connect all elements with `data-connect="[aspect-name]"` to their aspects and start mutation observers to watch for new elements and changes to the `data-connect` attribute.

#### `disconnect()`

Disconnect all aspects and observers.

#### `config`

Configuration options.

<br>

### HTML attributes

#### `data-connect="[aspect-name]"`

Attach the aspect `[aspectName]` to the element.

#### `data-[aspect-name].[attribute-name]="[value]"`

Set the attribute property `[attributeName]` on the aspect `[aspectName]` on this element to `[value]`.

#### `data-[aspect-name]='{"[attributeName]": "[value]"}'`

Set multiple attribute properties on the aspect `[aspectName]` on this element to the values in the object.


#### `data-connect="[aspect-name].[connected-element-type]"`

Attach the element as type `[connectedElementType]` to the aspect `[aspectName]`.

#### `data-handler="[event]->[aspect-name].[method-name]"`

Call the method `[methodName]` on the aspect `[aspectName]` when the event `[event]` is triggered on the element.

#### `data-[aspect-name].[method-name].[parameter-name]="[value]"`

Set the parameter `[parameterName]` for the handler `[event]->[aspect-name].[method-name]` on this element. The parameter object is passed as the first argument to the method.

#### `data-[aspect-name].[method-name]='{"[attributeName]": "[value]"}'`

Set multiple parameters for the handler `[event]->[aspect-name].[method-name]` on this element to the values in the object, similar to the bulk attribute syntax for aspect attributes.

<br>
<br>







