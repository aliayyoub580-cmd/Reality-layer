import { z } from 'zod';

// ─── Auth Validations ───────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and a number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ─── Project Validations ────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name is too long'),
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Invalid URL format')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use HTTP or HTTPS protocol' }
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.hostname.length > 0 && parsed.hostname.includes('.');
        } catch {
          return false;
        }
      },
      { message: 'URL must have a valid domain' }
    )
    .refine(
      (url) => url.length <= 2048,
      { message: 'URL is too long (max 2048 characters)' }
    ),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name is too long')
    .optional(),
  url: z
    .string()
    .url('Invalid URL format')
    .optional(),
  crawlLimit: z
    .number()
    .int()
    .min(1, 'Crawl limit must be at least 1')
    .max(1000, 'Crawl limit cannot exceed 1000')
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ─── Crawl Validations ─────────────────────────────────────

export const startCrawlSchema = z.object({
  crawlLimit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),
});

export type StartCrawlInput = z.infer<typeof startCrawlSchema>;

// ─── Query Param Validations ────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

export const issueFilterSchema = paginationSchema.extend({
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
  type: z.string().optional(),
});

export const pageFilterSchema = paginationSchema.extend({
  status: z.string().optional(),
  minHealth: z.coerce.number().min(0).max(100).optional(),
  maxHealth: z.coerce.number().min(0).max(100).optional(),
  minDepth: z.coerce.number().int().min(0).optional(),
  maxDepth: z.coerce.number().int().min(0).optional(),
});
