import "server-only";

/**
 * Server-only RaiAccept client for NEYA ticket payments.
 *
 * API flow (official RaiAccept Code Integration docs):
 *   1. POST {auth}/auth/api/login          -> accessToken
 *   2. POST {api}/orders                   -> orderIdentification
 *   3. POST {api}/orders/{id}/checkout     -> sessionId + paymentRedirectURL
 *
 * Credentials and access tokens never leave the server and are never logged.
 * The token is kept for the lifetime of the client instance (one checkout
 * operation); refresh-token support can be layered on later.
 */

const PROD_AUTH_BASE_URL = "https://auth.raiaccept.com";
const PROD_API_BASE_URL = "https://trapi.raiaccept.com";

/** Abort provider requests after this long so hangs map to the retry/recoverable path. */
const REQUEST_TIMEOUT_MS = 20_000;

export type RaiAcceptOrderPayload = {
  consumer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobilePhone?: string;
    ipAddress?: string;
  };
  invoice: {
    amount: number;
    currency: string;
    description?: string;
    merchantOrderReference: string;
    items?: Array<{
      description?: string;
      numberOfItems: number;
      price: number;
    }>;
  };
  paymentMethodPreference: "CARD" | "GOOGLE_PAY" | "APPLE_PAY";
  urls: {
    successUrl: string;
    cancelUrl: string;
    failUrl: string;
    notificationUrl?: string;
  };
};

export type RaiAcceptErrorPhase = "auth" | "create_order" | "create_checkout" | "get_order";

export class RaiAcceptError extends Error {
  readonly phase: RaiAcceptErrorPhase;
  readonly httpStatus: number | null;
  /** Safe provider error code, when the API returned one. */
  readonly providerCode: string | null;
  /** Safe provider error message, when the API returned one. */
  readonly providerMessage: string | null;
  /** True when a provider order/checkout may already exist on RaiAccept's side. */
  readonly uncertain: boolean;
  readonly orderIdentification: string | null;

  constructor(
    message: string,
    ctx: {
      phase: RaiAcceptErrorPhase;
      httpStatus?: number | null;
      providerCode?: string | null;
      providerMessage?: string | null;
      uncertain?: boolean;
      orderIdentification?: string | null;
    },
  ) {
    super(message);
    this.name = "RaiAcceptError";
    this.phase = ctx.phase;
    this.httpStatus = ctx.httpStatus ?? null;
    this.providerCode = ctx.providerCode ?? null;
    this.providerMessage = ctx.providerMessage ?? null;
    this.uncertain = ctx.uncertain ?? false;
    this.orderIdentification = ctx.orderIdentification ?? null;
  }
}

type RaiAcceptConfig = {
  username: string;
  password: string;
  authBaseUrl: string;
  apiBaseUrl: string;
  integrationName: string;
  integrationVersion: string;
  integrationVendor: string;
};

function readConfig(): RaiAcceptConfig | null {
  const username = process.env.RAIACCEPT_USERNAME?.trim();
  const password = process.env.RAIACCEPT_PASSWORD;
  if (!username || !password) return null;
  return {
    username,
    password,
    authBaseUrl: (process.env.RAIACCEPT_AUTH_BASE_URL ?? PROD_AUTH_BASE_URL).replace(/\/+$/, ""),
    apiBaseUrl: (process.env.RAIACCEPT_API_BASE_URL ?? PROD_API_BASE_URL).replace(/\/+$/, ""),
    integrationName: process.env.RAIACCEPT_INTEGRATION_NAME?.trim() || "NEYA",
    integrationVersion: process.env.RAIACCEPT_INTEGRATION_VERSION?.trim() || "1.0.0",
    integrationVendor: process.env.RAIACCEPT_INTEGRATION_VENDOR?.trim() || "NEYA",
  };
}

/**
 * Extract only safe, non-sensitive fields from a RaiAccept error body.
 * Never returns raw payloads or rejected values (which may contain PII/card data).
 */
async function safeErrorBody(res: Response): Promise<{
  code?: string;
  message?: string;
  fieldErrors: string[];
}> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { fieldErrors: [] };
  }
  if (typeof body !== "object" || body === null) return { fieldErrors: [] };
  const obj = body as Record<string, unknown>;
  const code = typeof obj.code === "string" ? obj.code.slice(0, 120) : undefined;
  const message = typeof obj.message === "string" ? obj.message.slice(0, 300) : undefined;
  const fieldErrors: string[] = [];
  if (Array.isArray(obj.errors)) {
    for (const entry of obj.errors) {
      if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).message === "string") {
        const fieldMessage = ((entry as Record<string, unknown>).message as string).slice(0, 200);
        if (fieldMessage) fieldErrors.push(fieldMessage);
      }
    }
  }
  return { code, message, fieldErrors: fieldErrors.slice(0, 5) };
}

export class RaiAcceptClient {
  private cfg: RaiAcceptConfig | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private config(): RaiAcceptConfig {
    if (!this.cfg) {
      const cfg = readConfig();
      if (!cfg) {
        throw new RaiAcceptError("RaiAccept is not configured (RAIACCEPT_USERNAME / RAIACCEPT_PASSWORD)", {
          phase: "auth",
        });
      }
      this.cfg = cfg;
    }
    return this.cfg;
  }

  /**
   * Authenticate against the RaiAccept Auth Service. The access token is kept
   * for the current server operation and used as the Bearer token for API calls.
   */
  async authenticate(): Promise<void> {
    const cfg = this.config();
    let res: Response;
    try {
      res = await fetch(`${cfg.authBaseUrl}/auth/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          username: cfg.username,
          password: cfg.password,
          integrationContext: {
            type: "CODE",
            data: {
              name: cfg.integrationName,
              version: cfg.integrationVersion,
              vendor: cfg.integrationVendor,
            },
          },
        }),
      });
    } catch {
      // Network-level failure: nothing was created, but do not expose details.
      throw new RaiAcceptError("RaiAccept authentication request failed", {
        phase: "auth",
        uncertain: true,
      });
    }

    if (!res.ok) {
      const summary = await safeErrorBody(res);
      throw new RaiAcceptError("RaiAccept authentication was rejected", {
        phase: "auth",
        httpStatus: res.status,
        providerCode: summary.code,
        providerMessage: summary.message ?? summary.fieldErrors[0],
      });
    }

    const data = (await res.json().catch(() => null)) as {
      accessToken?: string;
      refreshToken?: string;
    } | null;
    if (!data?.accessToken) {
      throw new RaiAcceptError("RaiAccept login response did not include an access token", {
        phase: "auth",
        httpStatus: res.status,
        uncertain: true,
      });
    }
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken ?? null;
  }

  private async ensureAccessToken(): Promise<void> {
    if (!this.accessToken) await this.authenticate();
  }

  private async authorizedJson(
    path: string,
    body: unknown,
    phase: RaiAcceptErrorPhase,
    orderIdentification?: string,
  ): Promise<Record<string, unknown>> {
    await this.ensureAccessToken();
    const apiBaseUrl = this.config().apiBaseUrl;

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify(body),
      });
    } catch {
      throw new RaiAcceptError("RaiAccept API request failed", {
        phase,
        uncertain: true,
        orderIdentification,
      });
    }

    if (!res.ok) {
      const summary = await safeErrorBody(res);
      // A 5xx means the provider may have created the order server-side even
      // though we did not receive a response — treat it as uncertain.
      throw new RaiAcceptError("RaiAccept API request was rejected", {
        phase,
        httpStatus: res.status,
        providerCode: summary.code,
        providerMessage: summary.message ?? summary.fieldErrors[0],
        uncertain: res.status >= 500,
        orderIdentification,
      });
    }

    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  /**
   * Create a RaiAccept order entry. Returns the RaiAccept orderIdentification
   * to use for the checkout session.
   */
  async createOrder(payload: RaiAcceptOrderPayload): Promise<{ orderIdentification: string }> {
    const data = await this.authorizedJson("/orders", payload, "create_order");
    const orderIdentification =
      typeof data.orderIdentification === "string" ? data.orderIdentification : null;
    if (!orderIdentification) {
      throw new RaiAcceptError("RaiAccept order response did not include an orderIdentification", {
        phase: "create_order",
        uncertain: true,
      });
    }
    return { orderIdentification };
  }

  /**
   * Create the RaiAccept payment form session for an existing order.
   * Returns the session ID and the payment form URL to redirect the customer to.
   */
  async createCheckout(
    orderIdentification: string,
    payload: RaiAcceptOrderPayload,
  ): Promise<{ sessionId: string; paymentRedirectURL: string }> {
    const data = await this.authorizedJson(
      `/orders/${encodeURIComponent(orderIdentification)}/checkout`,
      payload,
      "create_checkout",
      orderIdentification,
    );
    const sessionId = typeof data.sessionId === "string" ? data.sessionId : null;
    const paymentRedirectURL =
      typeof data.paymentRedirectURL === "string" ? data.paymentRedirectURL : null;
    if (!sessionId || !paymentRedirectURL) {
      throw new RaiAcceptError("RaiAccept checkout response did not include a payment URL", {
        phase: "create_checkout",
        uncertain: true,
        orderIdentification,
      });
    }
    return { sessionId, paymentRedirectURL };
  }

  /**
   * Retrieve the final RaiAccept order details. This authenticated response is
   * the source of truth for the order status (DRAFT, CHECKOUT, PAID,
   * PARTIALLY_REFUNDED, FULLY_REFUNDED, FAILED, CANCELED, ABANDONED) and is
   * used to verify webhook notifications before finalizing a NEYA order.
   */
  async getOrder(orderIdentification: string): Promise<RaiAcceptOrderDetails> {
    await this.ensureAccessToken();
    const apiBaseUrl = this.config().apiBaseUrl;

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderIdentification)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new RaiAcceptError("RaiAccept order retrieval failed", {
        phase: "get_order",
        uncertain: true,
        orderIdentification,
      });
    }

    if (!res.ok) {
      const summary = await safeErrorBody(res);
      throw new RaiAcceptError("RaiAccept order retrieval was rejected", {
        phase: "get_order",
        httpStatus: res.status,
        providerCode: summary.code,
        providerMessage: summary.message ?? summary.fieldErrors[0],
        uncertain: res.status >= 500,
        orderIdentification,
      });
    }

    return (await res.json().catch(() => ({}))) as RaiAcceptOrderDetails;
  }
}

/** A fresh client per server operation (fresh login + access token). */
export function getRaiAcceptClient(): RaiAcceptClient {
  return new RaiAcceptClient();
}

/**
 * True when the configured RaiAccept API base URL targets production.
 * A sandbox setup overrides RAIACCEPT_API_BASE_URL; the production endpoint is
 * the default. Used to reject cross-environment notifications.
 */
export function isProductionEnvironment(): boolean {
  const baseUrl = (process.env.RAIACCEPT_API_BASE_URL ?? PROD_API_BASE_URL).replace(/\/+$/, "");
  return baseUrl === PROD_API_BASE_URL;
}

/** Subset of the Retrieve order details response used for webhook verification. */
export type RaiAcceptOrderDetails = {
  orderIdentification?: string;
  status?: string;
  isProduction?: boolean;
  invoice?: {
    amount?: number;
    currency?: string;
    merchantOrderReference?: string;
  };
};
