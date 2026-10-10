/** Shape of the errors surfaced by HttpClient, RxJS timeouts and the API. */
export interface ApiError {
  name?: string;
  status?: number;
  message?: string;
  error?: {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
  };
}

/** A user-facing error produced by the services' error handlers. */
export interface ApiErrorMessage {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface MessageResponse {
  message: string;
}
