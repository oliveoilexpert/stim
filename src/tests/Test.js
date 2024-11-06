import { Aspect } from '../Aspect.js'

/**
 * @property {Map} toggleElements
 */
export default class Test extends Aspect {
  static elements = []
  static attributes = {

  }
  connected() {
    console.log(this.el.classList)
  }
}
