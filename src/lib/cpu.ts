export function runCpuBound<T>(fn: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setImmediate(() => {
      try {
        resolve(fn())
      } catch (err) {
        reject(err)
      }
    })
  })
}
