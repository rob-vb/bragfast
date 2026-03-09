export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

export interface ApiParam {
  name: string
  type: string
  required: boolean
  description: string
  children?: ApiParam[]
}

export interface CodeExample {
  curl: string
  javascript: string
  python: string
}

export interface ApiEndpoint {
  method: HttpMethod
  path: string
  anchor: string
  title: string
  description: string
  params?: ApiParam[]
  requestExample?: CodeExample
  responseExample: string
  responseStatus: number
}

export interface StatusCode {
  code: number
  label: string
  description: string
}

export interface ApiSection {
  title: string
  anchor: string
  description: string
  endpoints: ApiEndpoint[]
  sampleObject?: string
  statusCodes?: StatusCode[]
}
