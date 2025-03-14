import { expect } from "vitest";

expect.extend({
  async responseSuccessWith(received: Response, type: "json" | "text", expectedBody) {
    expect(received).instanceof(Response);

    if (received.status !== 200) {
      return {
        pass: false,
        message() {
          return `expected response.status is 200`;
        },
        expected: 200,
        actual: received.status,
      };
    }
    let body = null;
    if (received.body) {
      switch (type) {
        case "json":
          body = await received.json();
          break;
        case "text":
          body = await received.text();
        default:
          break;
      }
    }

    try {
      expect(body).toEqual(expectedBody);
    } catch (error) {
      return {
        pass: false,
        message() {
          const raw = error instanceof Error ? error.message : "";
          return "Body is not equal. " + raw;
        },
        expected: expectedBody,
        actual: body,
      };
    }
    return {
      pass: true,
      message() {
        return "";
      },
    };
  },
  async responseStatus(received: Response, expected) {
    expect(received).instanceof(Response);

    if (received.status !== expected) {
      return {
        pass: false,
        message() {
          return `expected response.status is ${expected}`;
        },
        expected: expected,
        actual: received.status,
      };
    }

    return {
      pass: true,
      message() {
        return "";
      },
    };
  },
});

interface CustomMatchers<R = unknown> {
  responseSuccessWith: (type: "json" | "text", value: any) => Promise<Awaited<R>>;
  responseStatus: (value: number) => Promise<Awaited<R>>;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
