/**
 * Miscellanous utility functions
 *
 * @module
 */

/**
 * Solit string into maximum of n strings
 *
 * @param string - string to split
 * @param delimter - delimiter of split
 * @param n - max strings
 */

export function mySplit (
  string: string,
  delimiter: string,
  n: number
) {
  const parts = string.split(delimiter)
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)])
}

/**
 * Check if is object
 * 
 * @param a - object to be checked
 */

export function isObject (a: any) {
  return (!!a) && (a.constructor === Object)
}

/**
 * Convert error message to string
 *
 * @param error - error object to convert to string
 */

export function getErrorMessage (error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}
