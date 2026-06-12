import type { Type } from "@nestjs/common";
import type {
  ILogService,
  ITranslationService,
} from "@esmaeel_emadi/nestjs-core";

/** Injection token for MetadataModule options. */
export const METADATA_OPTIONS = "METADATA_OPTIONS";

/** Injection token for the database connection used by metadata repos. */
export const METADATA_DB = "METADATA_DB";

/** Injection token for the optional translation service. */
export const TRANSLATION_SERVICE = "TRANSLATION_SERVICE";

/**
 * Configuration for MetadataModule.forRoot().
 */
export interface MetadataModuleOptions {
  /** Drizzle database injection token (e.g. MAIN_DB). */
  database: string;

  /** Feature flags */
  features?: {
    /** Enable multi-tenant scoping. Default: true. */
    multiTenant?: boolean;
    /** Enable access-control guard hooks. Default: true. */
    accessControl?: boolean;
    /** Enable soft-delete. Default: true. */
    softDelete?: boolean;
    /** Enable permission-based field visibility. Default: true. */
    fieldVisibility?: boolean;
    /** Enable $trl_ translation resolution. Default: false. */
    translations?: boolean;
  };

  /** Service overrides / implementations */
  services?: {
    /** Audit log service (implements ILogService). */
    logService?: Type<ILogService>;
    /** Translation resolver (implements ITranslationService). */
    translationService?: Type<ITranslationService>;
  };

  /** Extra NestJS modules to import (e.g. UsersModule for cross-module deps). */
  imports?: Type<unknown>[];

  /** Extra providers to register. */
  providers?: Type<unknown>[];
}
