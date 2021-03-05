/**
 * @license
 * Copyright (c) 2021 The Polymer Project Authors. All rights reserved.
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

 import {TemplateResult} from './lib/template-result.js';
 import {Part} from './lib/part.js';
 /**
  * Tests if a value is a TemplateResult.
  */
 export const isTemplateResult = (value: unknown): value is TemplateResult =>
   value instanceof TemplateResult;

 // Everything below this has been moved to this file to add forward
 // compatibility for Lit 2 and prevent circular dependencies
 // eslint-disable-next-line @typescript-eslint/ban-types
 export const directives = new WeakMap<object, true>();

 export type DirectiveFn = (part: Part) => void;

 export const isDirective = (o: unknown): o is DirectiveFn => {
   return typeof o === 'function' && directives.has(o);
 };


 export const PartType = {
   ATTRIBUTE: 1,
   CHILD: 2,
   PROPERTY: 3,
   BOOLEAN_ATTRIBUTE: 4,
   EVENT: 5,
   ELEMENT: 6,
 } as const;

 export type PartType = typeof PartType[keyof typeof PartType];
