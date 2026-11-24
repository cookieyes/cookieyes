/** A reactive boolean a test can flip, since a plain test file cannot declare `$state`. */
export function makeFlag(initial: boolean): { value: boolean } {
  let value = $state(initial);
  return {
    get value() {
      return value;
    },
    set value(next: boolean) {
      value = next;
    },
  };
}
