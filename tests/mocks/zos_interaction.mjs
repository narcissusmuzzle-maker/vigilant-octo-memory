export const GESTURE_LEFT = 'L', GESTURE_RIGHT = 'R', GESTURE_UP = 'U', GESTURE_DOWN = 'D'
export function onGesture(o) { globalThis.__GESTURE = o.callback }
