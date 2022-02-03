export function mySplit (
  string: string,
  delimiter: string,
  n: number
) {
  const parts = string.split(delimiter)
  return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)])
}
