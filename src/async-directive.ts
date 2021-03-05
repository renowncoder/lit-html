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

import {Directive, PartInfo} from './directive.js';
import {Part} from './lib/part.js';
import {AttributePart, BooleanAttributePart, EventPart, NextPart, NodePart, PropertyPart} from './lib/parts.js';

/**
 * A superclass for directives that need to asynchronously update.
 */
export abstract class AsyncDirective extends Directive {
  private readonly ddPart: Part;
  private renderedYet = false;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    this.ddPart = (partInfo as NextPart).legacyPart;
  }

  private ddGetNode(): Node|undefined {
    if (this.ddPart instanceof NodePart) {
      return this.ddPart.startNode;
    } else if (this.ddPart instanceof EventPart) {
      return this.ddPart.element;
    } else if (this.ddPart instanceof BooleanAttributePart) {
      return this.ddPart.element;
    } else if (
        this.ddPart instanceof PropertyPart ||
        this.ddPart instanceof AttributePart) {
      return this.ddPart.committer.element;
    }
    return undefined;
  }

  private shouldRender() {
    if (!this.renderedYet) {
      this.renderedYet = true;
      return true;
    }
    const node = this.ddGetNode();
    if (node != null && !node.isConnected) {
      // node is disconnected, do not render
      return false;
    }
    return true;
  }

  setValue(value: unknown) {
    if (!this.shouldRender()) {
      // node is disconnected, do nothing.
      return;
    }

    this.ddPart.setValue(value);
    this.ddPart.commit();
  }

  /**
   * User callbacks for implementing logic to release any
   * resources/subscriptions that may have been retained by this directive.
   * Since directives may also be re-connected, `reconnected` should also be
   * implemented to restore the working state of the directive prior to the next
   * render.
   *
   * In the v1 version of these APIs, we don't monitor for disconnection and
   * reconnection, we only call these methods when setValue is called.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected disconnected() {
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected reconnected() {
  }
}