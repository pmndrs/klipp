import type { ConfinerBounds } from '../../core/extension/confiner';
import { ConfinerExtension } from '../../core/extension/ConfinerExtension';

import {
  createConfinerBoundsScratch,
  resolveConfinerBounds,
  type ConfinerBoundsThree,
} from '../resolve/resolveConfinerBounds';

/** `ConfinerExtension` reading a three.js `Box3` or `Sphere`, also when it changes. */
export class ConfinerExtensionThree extends ConfinerExtension<ConfinerBoundsThree> {
  private readonly scratch = createConfinerBoundsScratch();

  protected override readBounds(): ConfinerBounds | null {
    return resolveConfinerBounds(this.scratch, this.bounds);
  }
}
