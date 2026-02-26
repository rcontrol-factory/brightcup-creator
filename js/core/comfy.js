/* FILE: /js/core/comfy.js */
// Bright Cup Creator — /js/core/comfy.js
// Compatibility bridge (PADRÃO):
// Some modules expect ComfyClient to provide helpers like tryGetLatestImages().
// The newer implementation lives in ./comfy_client.js.
// We re-export it here to keep imports stable.

export { ComfyClient } from './comfy_client.js';
