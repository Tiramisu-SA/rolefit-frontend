export interface FieldError {
  field: string;
  message: string;
}

/** Plain-object form of ApiError: what a Server Action can return to the browser. */
export interface SerializedApiError {
  code: string;
  message: string;
  status?: number;
  fieldErrors?: FieldError[];
}

/** The one error type pages see. `message` is always safe to show. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly fieldErrors?: FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): SerializedApiError {
    return { code: this.code, message: this.message, status: this.status, fieldErrors: this.fieldErrors };
  }

  static from(e: SerializedApiError): ApiError {
    return new ApiError(e.code, e.message, e.status, e.fieldErrors);
  }
}

/** Server Actions return this instead of throwing (Next hides thrown messages in production). */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: SerializedApiError };

export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw ApiError.from(result.error);
}
