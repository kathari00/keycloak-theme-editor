type ClassValue = string | undefined | null | false

export function cx(...inputs: ClassValue[]): string {
  const inp = Array.isArray(inputs[0]) ? inputs[0] : [...inputs]
  return inp.filter(Boolean).join(' ')
}
