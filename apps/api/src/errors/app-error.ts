export const PROBLEM_TYPE_BASE = "https://api.example.com/problems";

export type ProblemDetails = {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    code?: string;
    errors?: unknown;
};

type AppErrorInit = {
    status: number;
    type: string;
    title: string;
    detail?: string;
    code?: string;
    errors?: unknown;
};

export class AppError extends Error {
    status: number;
    type: string;
    title: string;
    detail?: string;
    code?: string;
    errors?: unknown;

    constructor(init: AppErrorInit) {
        super(init.detail ?? init.title);
        this.name = new.target.name;
        this.status = init.status;
        this.type = init.type;
        this.title = init.title;
        this.detail = init.detail;
        this.code = init.code;
        this.errors = init.errors;
    }
}

export class ValidationError extends AppError {
    constructor(detail: string, errors: unknown) {
        super({
            status: 400,
            type: "validation-error",
            title: "Request validation failed",
            code: "VALIDATION_FAILED",
            detail,
            errors,
        });
    }
}

export class NotFoundError extends AppError {
    constructor(detail: string) {
        super({
            status: 404,
            type: "not-found",
            title: "Resource not found",
            code: "NOT_FOUND",
            detail,
        });
    }
}

export class ConflictError extends AppError {
    constructor(detail: string) {
        super({
            status: 409,
            type: "conflict",
            title: "Conflict",
            code: "CONFLICT",
            detail,
        });
    }
}
