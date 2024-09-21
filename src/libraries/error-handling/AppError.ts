export class AppError extends Error {
  HTTPStatus: number;
  isTrusted: boolean;
  cause: null;
  constructor(
    name: string,
    message: string | undefined,
    HTTPStatus = 500,
    isTrusted = true,
    cause = null
  ) {
    super(message);
    this.name = name;
    this.message = message ?? "";
    this.HTTPStatus = HTTPStatus;
    this.isTrusted = isTrusted;
    this.cause = cause;
  }
}
