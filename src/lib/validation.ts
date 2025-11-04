import { z } from "zod";

// Session code validation
export const sessionCodeSchema = z
  .string()
  .min(4, "Session code must be at least 4 characters")
  .max(20, "Session code must not exceed 20 characters")
  .regex(/^[a-z0-9]+$/, "Session code can only contain lowercase letters and numbers")
  .refine(
    (val) => !["admin", "api", "auth", "test", "demo"].includes(val),
    "This session code is reserved"
  );

// Password validation with strong requirements
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Text content validation
export const textContentSchema = z
  .string()
  .max(100000, "Text content is too large (max 100KB)");

// File validation
export const fileSchema = z.object({
  name: z
    .string()
    .max(255, "Filename is too long")
    .regex(/^[\w\-. ]+$/, "Filename contains invalid characters"),
  size: z
    .number()
    .max(10 * 1024 * 1024, "File size exceeds 10MB limit"),
  type: z.string().refine(
    (type) => {
      // Allow common file types
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/json",
        "application/zip",
      ];
      return allowedTypes.includes(type) || type.startsWith("image/");
    },
    "File type not allowed"
  ),
});

// Session creation validation
export const sessionCreationSchema = z.object({
  sessionCode: sessionCodeSchema,
  password: passwordSchema.optional(),
  isProtected: z.boolean(),
});
