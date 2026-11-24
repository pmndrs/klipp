import { quat, type Quat, type Vec3 } from 'math';

const yAxis: Vec3 = [0, 1, 0];

/** The rotation that turns `y` onto `up`: the frame of a scene whose up is `up`. */
export const upFrame = (out: Quat, up: Vec3): Quat => quat.rotationTo(out, yAxis, up);
