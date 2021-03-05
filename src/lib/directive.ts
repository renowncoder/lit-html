/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {directives, PartType} from '../directive-helpers.js';
import {Part} from './part.js';
import {AttributePart, BooleanAttributePart, ChildPart, EventPart, NextPart, NodePart, PropertyPart} from './parts.js';

export {DirectiveFn, isDirective, PartType} from '../directive-helpers.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/ban-types
export type DirectiveFactory = (...args: any[]) => object;

/**
 * Brands a function as a directive factory function so that lit-html will call
 * the function during template rendering, rather than passing as a value.
 *
 * A _directive_ is a function that takes a Part as an argument. It has the
 * signature: `(part: Part) => void`.
 *
 * A directive _factory_ is a function that takes arguments for data and
 * configuration and returns a directive. Users of directive usually refer to
 * the directive factory as the directive. For example, "The repeat directive".
 *
 * Usually a template author will invoke a directive factory in their template
 * with relevant arguments, which will then return a directive function.
 *
 * Here's an example of using the `repeat()` directive factory that takes an
 * array and a function to render an item:
 *
 * ```js
 * html`<ul><${repeat(items, (item) => html`<li>${item}</li>`)}</ul>`
 * ```
 *
 * When `repeat` is invoked, it returns a directive function that closes over
 * `items` and the template function. When the outer template is rendered, the
 * return directive function is called with the Part for the expression.
 * `repeat` then performs it's custom logic to render multiple items.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object.
 *
 * @example
 *
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 */
export const directive =
    <F extends DirectiveFactory>(factoryOrClass: F|DirectiveClass): F => {
      if (isDirectiveClass(factoryOrClass)) {
        return litNextDirective(factoryOrClass) as F;
      } else {
        return ((...args: unknown[]) => {
                 const d = factoryOrClass(...args);
                 directives.set(d, true);
                 return d;
               }) as F;
      }
    };

// Everything below this is for Lit 2 forwards compatibility

const isDirectiveClass = (factoryOrClass: DirectiveFactory|
                          DirectiveClass): factoryOrClass is DirectiveClass => {
  const isClass =
      !!(factoryOrClass as unknown as typeof Directive)._$isDirectiveClass$;
  return isClass;
};

export type AttributePartInfo = {
  readonly type: typeof PartType.ATTRIBUTE|
               typeof PartType.PROPERTY|
               typeof PartType.BOOLEAN_ATTRIBUTE|typeof PartType.EVENT;
  readonly strings?: ReadonlyArray<string>; readonly name: string; readonly tagName:
                                                                                string;
};

export type ChildPartInfo = {
  readonly type: typeof PartType.CHILD;
};

/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
export abstract class Directive {
  /**
   * @nocollapse
   * @internal
   */
  static readonly _$isDirectiveClass$ = true;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(_partInfo: PartInfo) {
  }
  abstract render(...props: Array<unknown>): unknown;
  update(_part: NextPart, props: Array<unknown>): unknown {
    return this.render(...props);
  }
}

export type DirectiveClass = {
  new (part: PartInfo): Directive;
};

/**
 * This utility type extracts the signature of a directive class's render()
 * method so we can use it for the type of the generated directive function.
 */
export type DirectiveParameters<C extends Directive> = Parameters<C['render']>;

/**
 * A generated directive function doesn't evaluate the directive, but just
 * returns a DirectiveResult object that captures the arguments.
 */
export type DirectiveResult<C extends DirectiveClass = DirectiveClass> = {
  /** @internal */
  _$litDirective$: C;
  /** @internal */
  values: DirectiveParameters<InstanceType<C>>;
};

/**
 * Information about the part a directive is bound to.
 *
 * This is useful for checking that a directive is attached to a valid part,
 * such as with directive that can only be used on attribute bindings.
 */
export type PartInfo = ChildPartInfo|AttributePartInfo;

// Converts Lit1 part to a Lit2 part
function legacyPartToPart(part: Part): NextPart {
  if (part instanceof NodePart) {
    return new ChildPart(part);
  } else if (part instanceof EventPart) {
    return new EventPart(part);
  } else if (part instanceof BooleanAttributePart) {
    return new BooleanAttributePart(part);
  } else if (part instanceof PropertyPart || part instanceof AttributePart) {
    return new AttributePart(part);
  }
  // ElementPartInfo doesn't exist in lit-html v1
  throw new Error(`Unknown part type`);
}

// Lit2 implementation of the directive fn
function litNextDirective<C extends DirectiveClass>(directiveClass: C) {
  const partToInstance =
      new WeakMap<Part, readonly[NextPart, InstanceType<C>]>();
  const result = directive((...props: unknown[]) => {
    return (part: Part) => {
      const cached = partToInstance.get(part);
      let modernPart, instance;
      if (cached === undefined) {
        modernPart = legacyPartToPart(part);
        instance = new directiveClass(modernPart) as InstanceType<C>;
        partToInstance.set(part, [modernPart, instance] as const );
      } else {
        modernPart = cached[0];
        instance = cached[1];
      }
      part.setValue(instance.update(modernPart, props));
      part.commit();
    };
  });

  return result as (...props: DirectiveParameters<InstanceType<C>>) =>
             (part: Part) => void;
}
