import { useState } from "react";
import { z } from "zod";

type ZodSchema<T> = z.ZodType<T>;

export function useZodForm<T>(
    schema: ZodSchema<T>,
    initialValues: T
) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function setField<K extends keyof T>(key: K, value: T[K]) {
        setValues((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function reset(newValues?: T) {
        setValues(newValues ?? initialValues);
        setErrors({});
    }

    function validate(): boolean {
        const result = schema.safeParse(values);

        if (result.success) {
            setErrors({});
            return true;
        }

        const fieldErrors: Record<string, string> = {};

        for (const issue of result.error.issues) {
            const path = issue.path[0];
            if (typeof path === "string") {
                fieldErrors[path] = issue.message;
            }
        }

        setErrors(fieldErrors);
        return false;
    }

    function getValidated(): T | null {
        const result = schema.safeParse(values);
        return result.success ? result.data : null;
    }

    return {
        values,
        setValues,
        setField,
        reset,
        validate,
        getValidated,
        errors,
    };
}