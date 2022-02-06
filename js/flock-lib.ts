export function mySplit (
  string: string,
  delimiter: string,
  n: number
) {
  const parts = string.split(delimiter)
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)])
}

export function isObject (a: any) {
  return (!!a) && (a.constructor === Object)
}

export function getErrorMessage (error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
