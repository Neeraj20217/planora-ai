import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional ? <span className="optional">Optional</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
