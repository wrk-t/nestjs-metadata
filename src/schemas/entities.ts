import {
  boolean,
  json,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { ids } from "../helpers/ids";
import { timestamps } from "../helpers/timestamps";

export const entities = pgTable(
  "entities",
  {
    ...ids,
    ...timestamps,

    // Basic entity information
    name: varchar("name", { length: 100 }).notNull(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    description: text("description"),
    displayName: varchar("display_name", { length: 255 }),

    // Tenant isolation
    tenantId: varchar("tenant_id", { length: 24 }),

    // System vs custom entities
    isSystem: boolean("is_system").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    // Metadata — stores entity-specific config including optional
    // meta-field validation rules under the "fields" key:
    //
    //   meta: {
    //     fields: [
    //       { name: "description", type: "text", required: true },
    //     ]
    //   }
    meta: json("meta").$type<Record<string, unknown> | null>(),
  },
  (table) => [
    uniqueIndex("entities_name_tenant_unique").on(table.name, table.tenantId),
  ],
);
