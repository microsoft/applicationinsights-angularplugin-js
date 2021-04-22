import { ErrorHandler } from '@angular/core';

export interface IErrorService extends ErrorHandler {
    handleError(error: any): void;
}
