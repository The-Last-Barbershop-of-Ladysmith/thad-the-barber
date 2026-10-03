import { Environment } from '../../src/environments/environment.model';
import { environment as development } from '../../src/environments/environment.development';
import { environment as test } from '../../src/environments/environment.test';

/** The build under test: CI serves the `test` build with Express; locally `ng serve` runs `development`. */
export const servedEnvironment: Environment = process.env['CI'] ? test : development;
