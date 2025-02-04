class ResponseDto<T> {
  status: boolean;
  message: string;
  data: T;

  constructor(status: boolean, message: string, data: T) {
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

export function createResponse<T>(
  status: boolean,
  message: string,
  data: T,
): ResponseDto<T> {
  return new ResponseDto<T>(status, message, data);
}
