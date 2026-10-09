export interface FieldError {
  field: string;
  message: string;
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
}
