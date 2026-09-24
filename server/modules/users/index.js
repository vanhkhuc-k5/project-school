/**
 * Users Module Entrypoint
 * Re-exports users routes, controller, service, and schemas.
 */

import usersRoutes from './users.routes.js';
export { usersController } from './users.controller.js';
export { usersService } from './users.service.js';
export { usersRepository } from './users.repository.js';
export * from './users.schema.js';

export default usersRoutes;
