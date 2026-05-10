import { describe, it, expect, vi } from 'vitest'
import type { InvokeCommand, InvokeCommandOutput } from '@aws-sdk/client-lambda'
import { makeInvokeHyperframesLambda } from '../video/hyperframes-lambda'

function uint8(json: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(json))
}

type Sender = (cmd: InvokeCommand) => Promise<InvokeCommandOutput>

function mockSender(impl: (cmd: InvokeCommand) => Promise<unknown>): Sender {
  return vi.fn(impl) as unknown as Sender
}

describe('makeInvokeHyperframesLambda', () => {
  it('invokes Lambda with the event payload and returns ok on { ok: true }', async () => {
    const send = mockSender(async () => ({
      $metadata: {},
      StatusCode: 200,
      Payload: uint8({ ok: true, durationMs: 1234 }),
    }))
    const invoke = makeInvokeHyperframesLambda({ functionName: 'fn', send })

    const result = await invoke({
      html: '<html></html>',
      variables: { headline: 'Hi' },
      format: 'square',
      duration: 8,
      presignedPutUrl: 'https://r2.signed/x.mp4',
    })

    expect(result).toEqual({ ok: true, durationMs: 1234 })
    expect(send).toHaveBeenCalledTimes(1)
    const sendMock = send as unknown as { mock: { calls: Array<[InvokeCommand]> } }
    const cmd = sendMock.mock.calls[0][0]
    expect(cmd.input.FunctionName).toBe('fn')
    const payload = cmd.input.Payload as Uint8Array
    expect(JSON.parse(new TextDecoder().decode(payload))).toEqual({
      html: '<html></html>',
      variables: { headline: 'Hi' },
      format: 'square',
      duration: 8,
      presignedPutUrl: 'https://r2.signed/x.mp4',
    })
  })

  it('returns { ok: false, reason } when Lambda payload reports failure', async () => {
    const send = mockSender(async () => ({
      $metadata: {},
      StatusCode: 200,
      Payload: uint8({ errorType: 'Error', errorMessage: 'render crashed' }),
      FunctionError: 'Unhandled',
    }))
    const invoke = makeInvokeHyperframesLambda({ functionName: 'fn', send })

    const result = await invoke({
      html: '<html></html>',
      variables: {},
      format: 'square',
      duration: 8,
      presignedPutUrl: 'https://r2.signed/x.mp4',
    })

    expect(result).toEqual({ ok: false, reason: 'render crashed' })
  })

  it('returns { ok: false, reason } when SDK send throws', async () => {
    const send = mockSender(async () => {
      throw new Error('aws timeout')
    })
    const invoke = makeInvokeHyperframesLambda({ functionName: 'fn', send })

    const result = await invoke({
      html: '<html></html>',
      variables: {},
      format: 'square',
      duration: 8,
      presignedPutUrl: 'https://r2.signed/x.mp4',
    })

    expect(result).toEqual({ ok: false, reason: 'aws timeout' })
  })
})
