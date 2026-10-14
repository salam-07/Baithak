import { z } from 'zod';

import { paginationShape } from './common.validator.js';



export const forYouQuerySchema = z.object({
  ...paginationShape,
});

export const popularQuerySchema = z.object({
  ...paginationShape,
});

export default { forYouQuerySchema, popularQuerySchema };
