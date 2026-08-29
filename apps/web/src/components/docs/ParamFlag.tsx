/**
 * Required/optional marker for a parameter or prop, used in the API tables. The
 * word itself is the content rather than an icon, so it survives being read aloud
 * and does not depend on the red/grey distinction.
 */
export function ParamFlag({ required = false }: { required?: boolean }) {
  return (
    <span className="cy-doc-flag" data-required={String(required)}>
      {required ? "required" : "optional"}
    </span>
  );
}
