/** Which rotation (if any) a Body applies to its offset before adding it to the target's world position. */
export type BindingMode =
  'worldSpace' | 'lockToTarget' | 'lockToTargetWithWorldUp' | 'lockToTargetNoRoll' | 'lockToTargetOnAssign';
