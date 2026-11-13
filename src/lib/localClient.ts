import type { Database, Json } from "@/integrations/supabase/types";

export const LOCAL_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export interface LocalUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string | null;
    [key: string]: unknown;
  };
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
}

export interface LocalSession {
  access_token: string;
  token_type: string;
  user: LocalUser;
}

export interface LocalDbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export interface FunctionsHttpError {
  message: string;
  name?: string;
  context?: Response;
}

export type FunctionsRelayError = FunctionsHttpError;
export type FunctionsFetchError = FunctionsHttpError;

export type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED";

export interface AuthStatusPayload {
  passwordRequired: boolean;
  unlocked: boolean;
  unconfigured?: boolean;
  serverUnavailable?: boolean;
}

export const LOCAL_ADMIN_USER: LocalUser = {
  id: LOCAL_ADMIN_ID,
  email: "admin@workspace.local",
  user_metadata: { full_name: "Local Workspace" },
  aud: "authenticated",
};

export const LOCAL_ADMIN_SESSION: LocalSession = {
  access_token: "local-cookie-session",
  token_type: "cookie",
  user: LOCAL_ADMIN_USER,
};

type PublicTables = Database["public"]["Tables"];
type PublicViews = Database["public"]["Views"];

type WorkspaceSettingsRow = {
  key: string;
  value: Json;
  updated_at: string;
};

type TableRow<T extends string> = T extends keyof PublicTables
  ? PublicTables[T]["Row"]
  : T extends keyof PublicViews
    ? PublicViews[T]["Row"]
    : T extends "workspace_settings"
      ? WorkspaceSettingsRow
      : Record<string, unknown>;

type FilterPayload =
  | { op: "eq" | "neq" | "gte" | "lte"; column: string; value: unknown }
  | { op: "in"; column: string; value: unknown[] }
  | { op: "is"; column: string; value: null | boolean };

interface QueryRequestPayload {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  filters: FilterPayload[];
  order: Array<{ column: string; ascending?: boolean; nullsFirst?: boolean }>;
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  maybeSingle?: boolean;
  count?: "exact" | null;
  head?: boolean;
  values?: unknown;
  onConflict?: string;
  returning?: boolean;
}

export type DbResponse<T> =
  | { data: T; count: number | null; error: null }
  | { data: null; count: number | null; error: LocalDbError };

export type RpcResponse<T> =
  | { data: T; error: null }
  | { data: null; error: LocalDbError };

type AuthListener = (event: AuthChangeEvent, session: LocalSession | null) => void;

class AuthBus {
  private listeners = new Set<AuthListener>();
  private inFlightStatus: Promise<AuthStatusPayload> | null = null;

  subscribe(listener: AuthListener): { unsubscribe: () => void } {
    this.listeners.add(listener);
    return {
      unsubscribe: () => {
        this.listeners.delete(listener);
      },
    };
  }

  emit(event: AuthChangeEvent, session: LocalSession | null): void {
    for (const listener of this.listeners) {
      listener(event, session);
    }
  }

  async fetchStatus(): Promise<AuthStatusPayload> {
    if (this.inFlightStatus) {
      return this.inFlightStatus;
    }

    this.inFlightStatus = (async () => {
      try {
        const res = await fetch("/api/auth/status", {
          method: "GET",
          credentials: "same-origin",
        });
        if (!res.ok) {
          return { passwordRequired: true, unlocked: false, serverUnavailable: true };
        }
        const json = (await res.json()) as Partial<AuthStatusPayload>;
        return {
          passwordRequired: Boolean(json.passwordRequired),
          unlocked: Boolean(json.unlocked),
          unconfigured: Boolean(json.unconfigured),
          serverUnavailable: false,
        };
      } catch {
        return { passwordRequired: true, unlocked: false, serverUnavailable: true };
      } finally {
        this.inFlightStatus = null;
      }
    })();

    return this.inFlightStatus;
  }
}

const sharedAuthBus = new AuthBus();

export async function apiFetch(
  input: string,
  init: RequestInit = {},
  options: { skipUnauthorizedLock?: boolean } = {}
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: "same-origin",
  });

  if (res.status === 401 && !options.skipUnauthorizedLock) {
    sharedAuthBus.emit("SIGNED_OUT", null);
  }

  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function postAiEndpoint<T = any>(
  endpoint: string,
  body: unknown,
  options: { signal?: AbortSignal; skipUnauthorizedLock?: boolean } = {}
): Promise<{ data: T | null; error: FunctionsHttpError | null }> {
  try {
    const res = await apiFetch(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        signal: options.signal,
      },
      { skipUnauthorizedLock: options.skipUnauthorizedLock }
    );

    if (!res.ok) {
      const err: FunctionsHttpError = {
        name: "FunctionsHttpError",
        message: `AI endpoint ${endpoint} returned ${res.status}`,
        context: res,
      };
      return { data: null, error: err };
    }

    const data = (await res.json()) as T;
    return { data, error: null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    return {
      data: null,
      error: {
        name: err instanceof Error ? err.name : "FunctionsFetchError",
        message: err instanceof Error ? err.message : "Failed to fetch",
      },
    };
  }
}

async function postJson(
  url: string,
  body: unknown,
  options: { signal?: AbortSignal; notifyUnauthorized?: () => void } = {}
): Promise<{ status: number; ok: boolean; json: Record<string, unknown> | null }> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (res.status === 401 && options.notifyUnauthorized) {
    options.notifyUnauthorized();
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, json };
}

function normalizeError(
  status: number,
  json: Record<string, unknown> | null,
  fallbackMessage: string
): LocalDbError {
  const rawErr = json?.error as { message?: unknown; code?: unknown } | string | undefined;
  if (typeof rawErr === "string") {
    return { message: rawErr, status };
  }
  if (rawErr && typeof rawErr === "object") {
    return {
      message:
        typeof rawErr.message === "string" ? rawErr.message : fallbackMessage,
      code: typeof rawErr.code === "string" ? rawErr.code : undefined,
      status,
    };
  }
  return { message: fallbackMessage, status };
}

export class LocalQueryBuilder<Row = Record<string, unknown>, Result = Row[]>
  implements PromiseLike<DbResponse<Result>>
{
  private readonly payload: QueryRequestPayload;
  private signal?: AbortSignal;
  private readonly notifyUnauthorized?: () => void;
  private executionPromise: Promise<DbResponse<Result>> | null = null;

  constructor(
    table: string,
    notifyUnauthorized?: () => void
  ) {
    this.notifyUnauthorized = notifyUnauthorized;
    this.payload = {
      table,
      action: "select",
      filters: [],
      order: [],
    };
  }

  select(
    columns = "*",
    opts?: { count?: "exact" | null; head?: boolean }
  ): LocalQueryBuilder<Row, Row[]> {
    this.payload.columns = columns;
    if (this.payload.action === "select") {
      if (opts?.count !== undefined) this.payload.count = opts.count;
      if (opts?.head !== undefined) this.payload.head = opts.head;
    } else {
      this.payload.returning = true;
      if (opts?.count !== undefined) this.payload.count = opts.count;
    }
    return this as unknown as LocalQueryBuilder<Row, Row[]>;
  }

  insert(values: object | object[]): this {
    this.payload.action = "insert";
    this.payload.values = values;
    return this;
  }

  update(values: object): this {
    this.payload.action = "update";
    this.payload.values = values;
    return this;
  }

  upsert(
    values: object | object[],
    opts?: { onConflict?: string }
  ): this {
    this.payload.action = "upsert";
    this.payload.values = values;
    if (opts?.onConflict) {
      this.payload.onConflict = opts.onConflict;
    }
    return this;
  }

  delete(opts?: { count?: "exact" | null }): this {
    this.payload.action = "delete";
    if (opts?.count !== undefined) {
      this.payload.count = opts.count;
    }
    return this;
  }

  eq(column: string, value: unknown): this {
    this.payload.filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.payload.filters.push({ op: "neq", column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.payload.filters.push({ op: "gte", column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.payload.filters.push({ op: "lte", column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.payload.filters.push({ op: "in", column, value: values });
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.payload.filters.push({ op: "is", column, value });
    return this;
  }

  order(
    column: string,
    opts?: { ascending?: boolean; nullsFirst?: boolean }
  ): this {
    const columns = column
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    for (const col of columns) {
      this.payload.order.push({
        column: col,
        ascending: opts?.ascending,
        nullsFirst: opts?.nullsFirst,
      });
    }
    return this;
  }

  limit(count: number): this {
    this.payload.limit = count;
    return this;
  }

  range(from: number, to: number): this {
    this.payload.range = { from, to };
    return this;
  }

  single(): LocalQueryBuilder<Row, Row> {
    this.payload.single = true;
    return this as unknown as LocalQueryBuilder<Row, Row>;
  }

  maybeSingle(): LocalQueryBuilder<Row, Row | null> {
    this.payload.maybeSingle = true;
    return this as unknown as LocalQueryBuilder<Row, Row | null>;
  }

  abortSignal(signal: AbortSignal): this {
    this.signal = signal;
    return this;
  }

  private async execute(): Promise<DbResponse<Result>> {
    try {
      const { status, ok, json } = await postJson("/api/db/query", this.payload, {
        signal: this.signal,
        notifyUnauthorized: this.notifyUnauthorized,
      });

      const count =
        typeof json?.count === "number" ? (json.count as number) : null;

      if (!ok || json?.error) {
        return {
          data: null,
          count,
          error: normalizeError(status, json, "Database request failed"),
        };
      }

      return {
        data: (json?.data ?? null) as Result,
        count,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      const code =
        err instanceof Error && err.name === "AbortError" ? "ABORT_ERR" : undefined;
      return {
        data: null,
        count: null,
        error: { message, code },
      };
    }
  }

  then<TResult1 = DbResponse<Result>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResponse<Result>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (!this.executionPromise) {
      this.executionPromise = this.execute();
    }
    return this.executionPromise.then(onfulfilled, onrejected);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LocalRpcBuilder<Result = any>
  implements PromiseLike<RpcResponse<Result>>
{
  private readonly fnName: string;
  private readonly params: Record<string, unknown>;
  private singleMode = false;
  private maybeSingleMode = false;
  private readonly notifyUnauthorized?: () => void;
  private executionPromise: Promise<RpcResponse<Result>> | null = null;

  constructor(
    fnName: string,
    params: Record<string, unknown> = {},
    notifyUnauthorized?: () => void
  ) {
    this.fnName = fnName;
    this.params = params;
    this.notifyUnauthorized = notifyUnauthorized;
  }

  single<T = Result>(): LocalRpcBuilder<T> {
    this.singleMode = true;
    return this as unknown as LocalRpcBuilder<T>;
  }

  maybeSingle<T = Result>(): LocalRpcBuilder<T | null> {
    this.maybeSingleMode = true;
    return this as unknown as LocalRpcBuilder<T | null>;
  }

  private async execute(): Promise<RpcResponse<Result>> {
    try {
      const { status, ok, json } = await postJson(
        `/api/rpc/${encodeURIComponent(this.fnName)}`,
        this.params,
        { notifyUnauthorized: this.notifyUnauthorized }
      );

      if (!ok || json?.error) {
        return {
          data: null,
          error: normalizeError(status, json, `RPC ${this.fnName} failed`),
        };
      }

      let data = json?.data ?? null;
      if ((this.singleMode || this.maybeSingleMode) && Array.isArray(data)) {
        if (this.singleMode && data.length !== 1) {
          return {
            data: null,
            error: {
              code: "PGRST116",
              message: `JSON object requested, multiple (or no) rows returned (got ${data.length})`,
              status: 406,
            },
          };
        }
        if (this.maybeSingleMode && data.length > 1) {
          return {
            data: null,
            error: {
              code: "PGRST116",
              message: `JSON object requested, multiple rows returned (got ${data.length})`,
              status: 406,
            },
          };
        }
        data = data[0] ?? null;
      }

      return { data: data as Result, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : "Network error" },
      };
    }
  }

  then<TResult1 = RpcResponse<Result>, TResult2 = never>(
    onfulfilled?:
      | ((value: RpcResponse<Result>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (!this.executionPromise) {
      this.executionPromise = this.execute();
    }
    return this.executionPromise.then(onfulfilled, onrejected);
  }
}

export function createLocalClient(options: { isPublic?: boolean } = {}) {
  const isPublic = Boolean(options.isPublic);
  const authBus = isPublic ? new AuthBus() : sharedAuthBus;

  const notifyUnauthorized = isPublic
    ? undefined
    : () => {
        authBus.emit("SIGNED_OUT", null);
      };

  const auth = {
    async getStatus(): Promise<AuthStatusPayload> {
      if (isPublic) {
        return { passwordRequired: false, unlocked: false };
      }
      return authBus.fetchStatus();
    },

    async getSession(): Promise<{
      data: { session: LocalSession | null };
      error: LocalDbError | null;
    }> {
      if (isPublic) {
        return { data: { session: null }, error: null };
      }
      const status = await authBus.fetchStatus();
      return {
        data: { session: status.unlocked ? LOCAL_ADMIN_SESSION : null },
        error: null,
      };
    },

    async getUser(): Promise<{
      data: { user: LocalUser | null };
      error: LocalDbError | null;
    }> {
      const { data, error } = await auth.getSession();
      return { data: { user: data.session?.user ?? null }, error };
    },

    async unlock(
      password: string
    ): Promise<{ error: LocalDbError | null; session: LocalSession | null }> {
      if (isPublic) {
        return { error: { message: "Cannot unlock public client" }, session: null };
      }
      try {
        const res = await fetch("/api/auth/unlock", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        let json: Record<string, unknown> | null = null;
        try {
          json = (await res.json()) as Record<string, unknown>;
        } catch {
          json = null;
        }

        if (!res.ok) {
          return {
            error: normalizeError(res.status, json, "Failed to unlock workspace"),
            session: null,
          };
        }

        authBus.emit("SIGNED_IN", LOCAL_ADMIN_SESSION);
        return { error: null, session: LOCAL_ADMIN_SESSION };
      } catch (err) {
        return {
          error: { message: err instanceof Error ? err.message : "Network error" },
          session: null,
        };
      }
    },

    async signOut(_opts?: { scope?: string }): Promise<{ error: LocalDbError | null }> {
      if (isPublic) {
        return { error: null };
      }
      try {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) {
          return { error: { message: "Failed to lock workspace", status: res.status } };
        }
        authBus.emit("SIGNED_OUT", null);
        return { error: null };
      } catch (err) {
        return {
          error: { message: err instanceof Error ? err.message : "Network error" },
        };
      }
    },

    onAuthStateChange(callback: AuthListener): {
      data: { subscription: { unsubscribe: () => void } };
    } {
      if (isPublic) {
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
      return { data: { subscription: authBus.subscribe(callback) } };
    },
  };

  return {
    from<T extends keyof PublicTables | keyof PublicViews | "workspace_settings" | (string & {})>(
      table: T
    ): LocalQueryBuilder<TableRow<T>, TableRow<T>[]> {
      return new LocalQueryBuilder<TableRow<T>, TableRow<T>[]>(
        table,
        notifyUnauthorized
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc<T = any>(
      fnName: string,
      params: Record<string, unknown> = {}
    ): LocalRpcBuilder<T> {
      return new LocalRpcBuilder<T>(fnName, params, notifyUnauthorized);
    },

    auth,
  };
}

export type LocalClient = ReturnType<typeof createLocalClient>;
