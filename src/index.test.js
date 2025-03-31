// Stim Test Suite
const { stim, Controller } = require('../dist/stim.umd.js');
const { expect, describe, beforeEach, afterEach, beforeAll, afterAll, it } = global;

describe('Stim', () => {
  // Setup and teardown
  let testArea;

  beforeEach(() => {
    // Create a test area in the DOM that will be cleaned up after each test
    testArea = document.createElement('div');
    testArea.id = 'test-area';
    document.body.appendChild(testArea);
  });

  afterEach(() => {
    // Clean up DOM
    if (testArea && testArea.parentNode) {
      testArea.parentNode.removeChild(testArea);
    }
  });

  // Helper function to create DOM elements with attributes
  function createElement(tag, attributes = {}, content = '', parent = testArea) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    if (content) {
      element.textContent = content;
    }
    parent.appendChild(element);
    return element;
  }

  // Helper to wait for DOM updates to process
  function waitForDomUpdates(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Define test controllers
  class TestController extends Controller {
    static props = {
      count: 0,
      active: false,
      message: 'Default message'
    };

    static targets = ['button', 'output'];

    // Lifecycle methods
    initialized() {
      this.initializeCalled = true;
    }

    connected() {
      this.connectedCalled = true;
    }

    disconnected() {
      this.disconnectedCalled = true;
    }

    // Prop change callbacks
    countPropChanged(oldVal, newVal) {
      this.countChanged = { oldVal, newVal };
      if (this.outputTarget) {
        this.outputTarget.textContent = `Count: ${newVal}`;
      }
    }

    // Target callbacks
    buttonTargetConnected(element) {
      this.buttonConnected = true;
      element.addEventListener('click', () => this.increment());
    }

    buttonTargetDisconnected(element) {
      this.buttonDisconnected = true;
    }

    outputTargetConnected(element) {
      this.outputConnected = true;
      element.textContent = `Count: ${this.count}`;
    }

    outputTargetDisconnected(element) {
      this.outputDisconnected = true;
    }

    // Actions
    increment(params = {}, event) {
      const step = params.step || 1;
      this.count += step;
    }

    reset() {
      this.count = 0;
    }
  }

  class ChildController extends Controller {
    static props = {
      enabled: true
    };

    // Use controller injection
    static injects = {
      'test-controller': {}
    };

    initialized() {
      this.initializeCalled = true;
    }

    connected() {
      this.connectedCalled = true;
    }

    disconnected() {
      this.disconnectedCalled = true;
    }

    callParent() {
      // Try different ways to access the parent controller
      if (this.testControllerInject) {
        this.testControllerInject.increment();
      }
    }
  }

  class ComplexController extends Controller {
    static props = {
      items: []
    };

    static targets = ['item'];

    itemTargetConnected(element) {
      this.itemConnections = this.itemConnections || [];
      this.itemConnections.push(element.textContent);
    }

    itemTargetDisconnected(element) {
      this.itemDisconnections = this.itemDisconnections || [];
      this.itemDisconnections.push(element.textContent);
    }
  }

  // Register controllers before tests
  beforeAll(() => {
    stim.registerController('test-controller', TestController);
    stim.registerController({
      ChildController,
      ComplexController
    });

    stim.connect();
  });

  afterAll(() => {
    stim.disconnect();
  });

  //=========================================================================
  // 1. CONTROLLER LIFECYCLE
  //=========================================================================
  describe('Controller Lifecycle', () => {
    it('should initialize and connect controllers when added to DOM', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.initializeCalled).toBe(true);
      expect(controller.connectedCalled).toBe(true);
    });

    it('should disconnect controllers when removed from DOM', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      element.parentNode.removeChild(element);
      await waitForDomUpdates();

      expect(controller.disconnectedCalled).toBe(true);
    });

    it('should persist controller instance when reconnected to DOM', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controllerBefore = stim.getController(element, 'test-controller');
      element.parentNode.removeChild(element);
      await waitForDomUpdates();

      testArea.appendChild(element);
      await waitForDomUpdates();

      const controllerAfter = stim.getController(element, 'test-controller');
      expect(controllerAfter).toBe(controllerBefore);
      expect(controllerAfter.connectedCalled).toBe(true);
    });

    it('initialized() should only be called once on an instance', async () => {
      class InitCounterController extends Controller {
        static props = {};

        initialized() {
          this.initCount = (this.initCount || 0) + 1;
        }

        connected() {
          this.connectCount = (this.connectCount || 0) + 1;
        }
      }

      stim.registerController('init-counter', InitCounterController);

      const element = createElement('div', {
        'data-controller': 'init-counter'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'init-counter');
      expect(controller.initCount).toBe(1);

      element.parentNode.removeChild(element);
      await waitForDomUpdates();

      testArea.appendChild(element);
      await waitForDomUpdates();

      expect(controller.initCount).toBe(1);
      expect(controller.connectCount).toBe(2);
    });

    it('controller connected() should only be called after initialized() or disconnected()', async () => {
      let callbackSequence = [];

      class CallbackTrackerController extends Controller {
        static props = {};

        initialized() {
          callbackSequence.push('initialized');
        }

        connected() {
          callbackSequence.push('connected');
        }

        disconnected() {
          callbackSequence.push('disconnected');
        }
      }

      stim.registerController('callback-tracker', CallbackTrackerController);
      callbackSequence = [];

      const element = createElement('div', {
        'data-controller': 'callback-tracker'
      });

      await waitForDomUpdates();
      expect(callbackSequence).toEqual(['initialized', 'connected']);

      callbackSequence = [];
      element.parentNode.removeChild(element);
      await waitForDomUpdates();

      testArea.appendChild(element);
      await waitForDomUpdates();

      expect(callbackSequence).toEqual(['disconnected', 'connected']);
    });

    it('disconnected() should only be called after a connected() callback', async () => {
      let disconnectedCallCount = 0;
      let connectedCallCount = 0;

      class DisconnectTrackerController extends Controller {
        static props = {};

        connected() {
          connectedCallCount++;
        }

        disconnected() {
          disconnectedCallCount++;
          expect(disconnectedCallCount).toBeLessThanOrEqual(connectedCallCount);
        }
      }

      stim.registerController('disconnect-tracker', DisconnectTrackerController);
      disconnectedCallCount = 0;
      connectedCallCount = 0;

      const element = createElement('div', {
        'data-controller': 'disconnect-tracker'
      });

      await waitForDomUpdates();
      element.parentNode.removeChild(element);
      await waitForDomUpdates();

      expect(connectedCallCount).toBe(1);
      expect(disconnectedCallCount).toBe(1);
    });

    it('controller.element should return controller element', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.element).toBe(element);

      // Also check alias if available
      if (controller.el) {
        expect(controller.el).toBe(element);
      }
    });

    it('should handle simultaneous connection and disconnection', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      // Immediately remove it
      element.remove();

      // Add it again
      testArea.appendChild(element);

      await waitForDomUpdates();

      // Controller should be connected
      const controller = stim.getController(element, 'test-controller');
      expect(controller).toBeDefined();
      expect(controller.connectedCalled).toBe(true);
    });

    it('should run initialize, connect, disconnect in the correct sequence', async () => {
      const sequence = [];

      class SequenceController extends Controller {
        initialized() { sequence.push('initialized'); }
        connected() { sequence.push('connected'); }
        disconnected() { sequence.push('disconnected'); }
      }

      stim.registerController('sequence-controller', SequenceController);
      sequence.length = 0;

      const element = createElement('div', {
        'data-controller': 'sequence-controller'
      });

      await waitForDomUpdates();
      element.remove();
      await waitForDomUpdates();
      testArea.appendChild(element);
      await waitForDomUpdates();

      expect(sequence).toEqual(['initialized', 'connected', 'disconnected', 'connected']);
    });
  });

  //=========================================================================
  // 2. PROPS (ATTRIBUTES)
  //=========================================================================
  describe('Props', () => {
    it('should initialize props with default values', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.count).toBe(0);
      expect(controller.active).toBe(false);
      expect(controller.message).toBe('Default message');
    });

    it('should initialize props with values from HTML attributes', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller',
        'data-test-controller.count': '10',
        'data-test-controller.active': 'true',
        'data-test-controller.message': 'Hello World'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.count).toBe(10);
      expect(controller.active).toBe(true);
      expect(controller.message).toBe('Hello World');
    });

    it('should initialize props with bulk JSON values', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller',
        'data-test-controller': '{"count": 20, "active": true, "message": "Bulk props"}'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.count).toBe(20);
      expect(controller.active).toBe(true);
      expect(controller.message).toBe('Bulk props');
    });

    it('should sync prop changes from JS to HTML', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 5;
      await waitForDomUpdates();

      expect(element.getAttribute('data-test-controller.count')).toBe('5');

      controller.active = true;
      await waitForDomUpdates();

      expect(element.hasAttribute('data-test-controller.active')).toBe(true);
    });

    it('should call prop change callbacks', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 8;
      await waitForDomUpdates();

      expect(controller.countChanged).toEqual({ oldVal: 0, newVal: 8 });
    });

    it('should remove prop attribute when value is reset to default', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller',
        'data-test-controller.count': '10'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.count).toBe(10);

      controller.count = 0; // Reset to default value
      await waitForDomUpdates();

      expect(element.hasAttribute('data-test-controller.count')).toBe(false);
    });

    it('should handle complex data types like arrays and objects', async () => {
      class ComplexPropsController extends Controller {
        static props = {
          arrayProp: [],
          objectProp: { key: 'value' }
        };
      }

      stim.registerController('complex-props', ComplexPropsController);

      const element = createElement('div', {
        'data-controller': 'complex-props',
        'data-complex-props.array-prop': '["item1", "item2"]',
        'data-complex-props.object-prop': '{"test": "value", "num": 42}'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'complex-props');
      expect(Array.isArray(controller.arrayProp)).toBe(true);
      expect(controller.arrayProp).toEqual(['item1', 'item2']);
      expect(typeof controller.objectProp).toBe('object');
      expect(controller.objectProp).toEqual({test: 'value', num: 42});

      controller.arrayProp = ['newItem'];
      controller.objectProp = {newKey: 'newValue'};
      await waitForDomUpdates();

      expect(element.getAttribute('data-complex-props.array-prop')).toBe('["newItem"]');
      expect(element.getAttribute('data-complex-props.object-prop')).toBe('{"newKey":"newValue"}');
    });

    it('should handle attributeChanged for non-prop attributes', async () => {
      class AttrChangeController extends Controller {
        static props = {
          tracked: true
        };

        attributeChanged(name, oldVal, newVal) {
          this.lastAttributeChange = { name, oldVal, newVal };
        }
      }

      stim.registerController('attr-change', AttrChangeController);

      const element = createElement('div', {
        'data-controller': 'attr-change'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'attr-change');
      element.setAttribute('class', 'test-class');
      await waitForDomUpdates();

      expect(controller.lastAttributeChange).toBeDefined();
      expect(controller.lastAttributeChange.name).toBe('class');
      expect(controller.lastAttributeChange.oldVal).toBe(null);
      expect(controller.lastAttributeChange.newVal).toBe('test-class');
    });

    it('should handle prop attributes with invalid JSON', async () => {
      class InvalidJsonController extends Controller {
        static props = {
          config: {},
          active: false
        };
      }

      stim.registerController('invalid-json', InvalidJsonController);

      const element = createElement('div', {
        'data-controller': 'invalid-json',
        'data-invalid-json.config': '{not valid json}',
        'data-invalid-json.active': 'true'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'invalid-json');
      expect(typeof controller.config).toBe('string');
      expect(controller.config).toBe('{not valid json}');
      expect(controller.active).toBe(true);
    });

    it('should handle boolean props correctly', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');

      // Empty attribute should be true for booleans
      element.setAttribute('data-test-controller.active', '');
      await waitForDomUpdates();
      expect(controller.active).toBe(true);

      // Only "false" or "0" should be false
      element.setAttribute('data-test-controller.active', 'false');
      await waitForDomUpdates();
      expect(controller.active).toBe(false);

      element.setAttribute('data-test-controller.active', '0');
      await waitForDomUpdates();
      expect(controller.active).toBe(false);

      // Other values should be true
      element.setAttribute('data-test-controller.active', 'anything');
      await waitForDomUpdates();
      expect(controller.active).toBe(true);
    });
  });

  //=========================================================================
  // 3. TARGETS (CONNECTED ELEMENTS)
  //=========================================================================
  describe('Targets', () => {
    it('should connect targets to controllers', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const button = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Increment', element);

      const output = createElement('div', {
        'data-target': 'test-controller.output'
      }, '', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.buttonTargets.has(button)).toBe(true);
      expect(controller.outputTargets.has(output)).toBe(true);
      expect(controller.buttonConnected).toBe(true);
      expect(controller.outputConnected).toBe(true);
    });

    it('should handle multiple of the same target type', async () => {
      const element = createElement('div', {
        'data-controller': 'complex-controller'
      });

      const item1 = createElement('li', {
        'data-target': 'complex-controller.item'
      }, 'Item 1', element);

      const item2 = createElement('li', {
        'data-target': 'complex-controller.item'
      }, 'Item 2', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'complex-controller');
      expect(controller.itemTargets.size).toBe(2);
      expect(controller.itemTargets.has(item1)).toBe(true);
      expect(controller.itemTargets.has(item2)).toBe(true);
    });

    it('should disconnect targets when removed from DOM', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const button = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Increment', element);

      const button2 = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Increment 2', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.buttonTargets.size).toBe(2);

      button.parentNode.removeChild(button);
      await waitForDomUpdates();

      expect(controller.buttonDisconnected).toBe(true);
      expect(controller.buttonTargets.size).toBe(1);
      expect(controller.buttonTargets.has(button2)).toBe(true);
    });

    it('should handle targets added after controller initialization', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      const button = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Increment', element);

      await waitForDomUpdates();

      expect(controller.buttonTargets.has(button)).toBe(true);
      expect(controller.buttonConnected).toBe(true);
    });

    it('should handle target connection if controller is added AFTER the targets', async () => {
      const button = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Button without controller');

      await waitForDomUpdates();

      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      element.appendChild(button);
      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.buttonTargets.has(button)).toBe(true);
      expect(controller.buttonConnected).toBe(true);
    });

    it('should handle remote targets with ID in descriptor', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller',
        'id': 'remote-test-controller'
      });

      await waitForDomUpdates();

      const button = createElement('button', {
        'data-target': 'test-controller.button#remote-test-controller'
      }, 'Remote Button');

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      expect(controller.buttonTargets.has(button)).toBe(true);
      expect(controller.buttonConnected).toBe(true);
    });

    it('should disconnect and reconnect targets when controller is disconnected and reconnected', async () => {
      let targetConnectCount = 0;
      let targetDisconnectCount = 0;

      class TargetTrackController extends Controller {
        static targets = ['item'];

        itemTargetConnected() {
          targetConnectCount++;
        }

        itemTargetDisconnected() {
          targetDisconnectCount++;
        }
      }

      stim.registerController('target-track', TargetTrackController);
      targetConnectCount = 0;
      targetDisconnectCount = 0;

      const element = createElement('div', {
        'data-controller': 'target-track'
      });

      createElement('div', {
        'data-target': 'target-track.item'
      }, 'Target Item', element);

      await waitForDomUpdates();
      expect(targetConnectCount).toBe(1);

      element.parentNode.removeChild(element);
      await waitForDomUpdates();
      expect(targetDisconnectCount).toBe(1);

      testArea.appendChild(element);
      await waitForDomUpdates();
      expect(targetConnectCount).toBe(2);
    });

    it('should handle nested controllers with proper scoping', async () => {
      const outerElement = createElement('div', {
        'data-controller': 'test-controller',
        'id': 'outer-controller'
      });

      const outerButton = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Outer Button', outerElement);

      const innerElement = createElement('div', {
        'data-controller': 'test-controller',
        'id': 'inner-controller'
      }, '', outerElement);

      const innerButton = createElement('button', {
        'data-target': 'test-controller.button'
      }, 'Inner Button', innerElement);

      await waitForDomUpdates();

      const outerController = stim.getController(outerElement, 'test-controller');
      const innerController = stim.getController(innerElement, 'test-controller');

      expect(outerController.buttonTargets.has(outerButton)).toBe(true);
      expect(outerController.buttonTargets.has(innerButton)).toBe(false);
      expect(innerController.buttonTargets.has(innerButton)).toBe(true);
      expect(innerController.buttonTargets.has(outerButton)).toBe(false);
    });

    it('should handle orphaned remote targets that are bound later', async () => {
      const remoteButton = createElement('button', {
        'data-target': 'test-controller.button#future-controller'
      }, 'Future Controller Button');

      await waitForDomUpdates();

      const controllerElement = createElement('div', {
        'data-controller': 'test-controller',
        'id': 'future-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(controllerElement, 'test-controller');
      expect(controller.buttonTargets.has(remoteButton)).toBe(true);
    });
  });

  //=========================================================================
  // 4. ACTIONS (EVENT HANDLERS)
  //=========================================================================
  describe('Actions', () => {
    it('should connect actions to controllers', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const output = createElement('div', {
        'data-target': 'test-controller.output'
      }, '', element);

      const button = createElement('button', {
        'data-action': 'test-controller.increment'
      }, 'Increment', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      button.click();
      await waitForDomUpdates();

      expect(controller.count).toBe(1);
      expect(output.textContent).toBe('Count: 1');
    });

    it('should handle actions with parameters', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const button = createElement('button', {
        'data-action': 'test-controller.increment',
        'data-test-controller.increment.step': '5'
      }, 'Increment by 5', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      button.click();
      await waitForDomUpdates();

      expect(controller.count).toBe(5);
    });

    it('should respect the "prevent" action option', async () => {
      const form = createElement('form', {
        'data-controller': 'test-controller',
        'data-action': 'submit[prevent]->test-controller.increment'
      });

      form.onsubmit = jest.fn();
      await waitForDomUpdates();

      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      await waitForDomUpdates();

      expect(submitEvent.defaultPrevented).toBe(true);

      const controller = stim.getController(form, 'test-controller');
      expect(controller.count).toBe(1);
    });

    it('should respect the "once" action option', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const button = createElement('button', {
        'data-action': 'click[once]->test-controller.increment'
      }, 'Once Button', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      button.click();
      await waitForDomUpdates();
      button.click();
      await waitForDomUpdates();

      expect(controller.count).toBe(1);
    });

    it('should respect the "stop" action option', async () => {
      const outer = createElement('div', {
        'data-controller': 'test-controller'
      });

      outer.addEventListener('click', () => {
        const controller = stim.getController(outer, 'test-controller');
        controller.count += 10;
      });

      const inner = createElement('button', {
        'data-action': 'click[stop]->test-controller.increment'
      }, 'Stop Button', outer);

      await waitForDomUpdates();

      const controller = stim.getController(outer, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      inner.click();
      await waitForDomUpdates();

      expect(controller.count).toBe(1);
    });

    it('should handle remote actions with ID in descriptor', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller',
        'id': 'remote-action-controller'
      });

      await waitForDomUpdates();

      const button = createElement('button', {
        'data-action': 'test-controller.increment#remote-action-controller'
      }, 'Remote Action');

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      button.click();
      await waitForDomUpdates();

      expect(controller.count).toBe(1);
    });

    it('should handle multiple actions on the same element', async () => {
      // Create two controllers that track actions
      class ActionTracker1 extends Controller {
        constructor(...args) {
          super(...args);
          this.actionTriggered = false;
        }

        trigger() {
          this.actionTriggered = true;
        }
      }

      class ActionTracker2 extends Controller {
        constructor(...args) {
          super(...args);
          this.actionTriggered = false;
        }

        trigger() {
          this.actionTriggered = true;
        }
      }

      stim.registerController('action-tracker1', ActionTracker1);
      stim.registerController('action-tracker2', ActionTracker2);

      const element = createElement('div', {
        'data-controller': 'action-tracker1 action-tracker2'
      });

      const button = createElement('button', {
        'data-action': 'action-tracker1.trigger action-tracker2.trigger'
      }, 'Multiple Actions', element);

      await waitForDomUpdates();

      const controller1 = stim.getController(element, 'action-tracker1');
      const controller2 = stim.getController(element, 'action-tracker2');

      button.click();
      await waitForDomUpdates();

      expect(controller1.actionTriggered).toBe(true);
      expect(controller2.actionTriggered).toBe(true);
    });

    it('should handle different event types on the same element', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller'
      });

      const input = createElement('input', {
        'data-action': 'click->test-controller.increment focus->test-controller.reset'
      }, '', element);

      await waitForDomUpdates();

      const controller = stim.getController(element, 'test-controller');
      controller.count = 0;
      await waitForDomUpdates();

      // Click should increment
      input.click();
      await waitForDomUpdates();
      expect(controller.count).toBe(1);

      // Focus should reset
      input.focus();
      await waitForDomUpdates();
      expect(controller.count).toBe(0);
    });
  });

  //=========================================================================
  // 5. CONTROLLER INJECTION
  //=========================================================================
  describe('Controller Injection', () => {
    it('should inject a parent controller into a child controller', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller child-controller'
      });

      await waitForDomUpdates();

      const childController = stim.getController(element, 'child-controller');
      const hasParentAccess = !!childController.testControllerInject;
      expect(hasParentAccess).toBe(true);
    });

    it('should allow a child to call methods on the parent', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller child-controller'
      });

      await waitForDomUpdates();

      const childController = stim.getController(element, 'child-controller');
      const testController = stim.getController(element, 'test-controller');

      testController.count = 0;
      await waitForDomUpdates();

      childController.callParent();
      await waitForDomUpdates();

      expect(testController.count).toBe(1);
    });

    it('injected controller should be available as controllerNameInject', async () => {
      class InjectionTestController extends Controller {
        static injects = {
          'test-controller': {}
        };
      }

      stim.registerController('injection-test', InjectionTestController);

      const element = createElement('div', {
        'data-controller': 'test-controller injection-test'
      });

      await waitForDomUpdates();

      const injectionController = stim.getController(element, 'injection-test');
      const testController = stim.getController(element, 'test-controller');

      expect(injectionController.testControllerInject).toBe(testController);
    });

    it('injected controller props override should work', async () => {
      class OverrideController extends Controller {
        static injects = {
          'test-controller': {
            count: 42,
            message: 'Overridden message'
          }
        };
      }

      stim.registerController('override-controller', OverrideController);

      const element = createElement('div', {
        'data-controller': 'override-controller'
      });

      await waitForDomUpdates();

      const testController = stim.getController(element, 'test-controller');
      expect(testController.count).toBe(42);
      expect(testController.message).toBe('Overridden message');
      expect(testController.active).toBe(false); // Not overridden, should be default
    });

    it('should properly initialize props from both HTML and injection', async () => {
      class MixedOverrideController extends Controller {
        static injects = {
          'test-controller': {
            count: 50,
            message: 'Injected message'
          }
        };
      }

      stim.registerController('mixed-override', MixedOverrideController);

      const element = createElement('div', {
        'data-controller': 'mixed-override',
        'data-test-controller.count': '100', // Should override injection
        'data-test-controller.active': 'true' // Not in injection
      });

      await waitForDomUpdates();

      const testController = stim.getController(element, 'test-controller');
      expect(testController.count).toBe(100); // HTML wins
      expect(testController.message).toBe('Injected message'); // Injection wins
      expect(testController.active).toBe(true); // HTML wins
    });

    it('should correctly inject multiple controllers', async () => {
      class MultiInjectController extends Controller {
        static props = { value: 0 };
      }

      class MultiInjectController2 extends Controller {
        static props = { value: 0 };
      }

      class ContainerController extends Controller {
        static injects = {
          'multi-inject-controller': { value: 1 },
          'multi-inject-controller2': { value: 2 }
        };
      }

      stim.registerController('multi-inject-controller', MultiInjectController);
      stim.registerController('multi-inject-controller2', MultiInjectController2);
      stim.registerController('container-controller', ContainerController);

      const element = createElement('div', {
        'data-controller': 'container-controller'
      });

      await waitForDomUpdates();

      const container = stim.getController(element, 'container-controller');
      const inject1 = stim.getController(element, 'multi-inject-controller');
      const inject2 = stim.getController(element, 'multi-inject-controller2');

      expect(inject1.value).toBe(1);
      expect(inject2.value).toBe(2);
      expect(container.multiInjectControllerInject).toBe(inject1);
      expect(container.multiInjectController2Inject).toBe(inject2);
    });
  });

  //=========================================================================
  // 6. CUSTOM EVENTS
  //=========================================================================
  describe('Custom Events', () => {
    it('should dispatch custom events with correct prefix', async () => {
      class EventController extends Controller {
        static props = {};

        fireEvent(detail = {}) {
          return this.dispatch('test-event', {
            detail,
            bubbles: true
          });
        }
      }

      stim.registerController('event-controller', EventController);

      let eventData = null;
      document.addEventListener('event-controller:test-event', (e) => {
        eventData = e.detail;
      });

      const element = createElement('div', {
        'data-controller': 'event-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'event-controller');
      const testData = { foo: 'bar' };
      controller.fireEvent(testData);
      await waitForDomUpdates();

      expect(eventData).toEqual(testData);
      document.removeEventListener('event-controller:test-event', () => {});
    });

    it('should allow custom event prefix', async () => {
      class CustomPrefixController extends Controller {
        static props = {};

        fireEventWithPrefix(prefix) {
          return this.dispatch('event', {
            prefix,
            bubbles: true
          });
        }
      }

      stim.registerController('prefix-controller', CustomPrefixController);

      const element = createElement('div', {
        'data-controller': 'prefix-controller'
      });

      await waitForDomUpdates();

      const controller = stim.getController(element, 'prefix-controller');
      let eventFired = false;
      const listener = () => { eventFired = true; };
      document.addEventListener('custom:event', listener);

      controller.fireEventWithPrefix('custom');
      await waitForDomUpdates();

      expect(eventFired).toBe(true);
      document.removeEventListener('custom:event', listener);
    });

    it('should support event bubbling', async () => {
      class EventBubbleController extends Controller {
        fireEvent() {
          this.dispatch('bubble', { bubbles: true });
        }
      }

      stim.registerController('event-bubble', EventBubbleController);

      const outer = createElement('div');
      const middle = createElement('div', {}, '', outer);
      const inner = createElement('div', {
        'data-controller': 'event-bubble'
      }, '', middle);

      let bubbleToMiddle = false;
      let bubbleToOuter = false;

      middle.addEventListener('event-bubble:bubble', () => { bubbleToMiddle = true; });
      outer.addEventListener('event-bubble:bubble', () => { bubbleToOuter = true; });

      await waitForDomUpdates();

      const controller = stim.getController(inner, 'event-bubble');
      controller.fireEvent();
      await waitForDomUpdates();

      expect(bubbleToMiddle).toBe(true);
      expect(bubbleToOuter).toBe(true);
    });
  });

  //=========================================================================
  // 7. REGISTRATION & UTILITY METHODS
  //=========================================================================
  describe('Registration & Utilities', () => {
    it('should support custom selector callbacks', async () => {
      let callbackCount = 0;
      stim.registerSelectorCallback('.test-selector', () => {
        callbackCount++;
      });

      createElement('div', { class: 'test-selector' });
      createElement('div', { class: 'test-selector' });
      await waitForDomUpdates();

      expect(callbackCount).toBe(2);
    });

    it('should handle object shorthand for registerController', async () => {
      class TestController1 extends Controller {
        static props = { value: 1 };
      }

      class TestController2 extends Controller {
        static props = { value: 2 };
      }

      stim.registerController({
        TestController1,
        TestController2
      });

      const element1 = createElement('div', {
        'data-controller': 'test-controller1'
      });

      const element2 = createElement('div', {
        'data-controller': 'test-controller2'
      });

      await waitForDomUpdates();

      const instance1 = stim.getController(element1, 'test-controller1');
      const instance2 = stim.getController(element2, 'test-controller2');

      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1.value).toBe(1);
      expect(instance2.value).toBe(2);
    });

    it('should properly kebab-case controller names', async () => {
      class CamelCaseController extends Controller {
        static props = { testValue: 42 };
      }

      class PascalCaseExample extends Controller {
        static props = { testValue: 43 };
      }

      stim.registerController({
        CamelCaseController,
        PascalCaseExample
      });

      const element1 = createElement('div', {
        'data-controller': 'camel-case-controller'
      });

      const element2 = createElement('div', {
        'data-controller': 'pascal-case-example'
      });

      await waitForDomUpdates();

      const controller1 = stim.getController(element1, 'camel-case-controller');
      const controller2 = stim.getController(element2, 'pascal-case-example');

      expect(controller1.testValue).toBe(42);
      expect(controller2.testValue).toBe(43);
    });

    it('should get all controllers on an element with getControllers', async () => {
      const element = createElement('div', {
        'data-controller': 'test-controller child-controller'
      });

      await waitForDomUpdates();

      const controllers = stim.getControllers ? stim.getControllers(element) : null;

      if (controllers) { // Only test if the method exists
        expect(controllers.length).toBe(2);
        expect(controllers.some(c => c instanceof TestController)).toBe(true);
        expect(controllers.some(c => c instanceof ChildController)).toBe(true);
      }
    });
  });
});