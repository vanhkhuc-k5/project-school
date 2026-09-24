/**
 * Profiles Module Barrel Export
 */

import profilesRoutes from './profiles.routes.js';

export { profilesController } from './profiles.controller.js';
export { profilesService } from './profiles.service.js';
export { profilesRepository } from './profiles.repository.js';
export * from './profiles.schema.js';

export default profilesRoutes;
