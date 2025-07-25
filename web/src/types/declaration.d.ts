declare module 'next' {
  export interface PageProps<T = Record<string, string>> {
    params: T
    searchParams?: Record<string, string | string[]>
  }
}
