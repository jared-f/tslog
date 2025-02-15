import "ts-jest";
import {
  IErrorObject,
  ILogObject,
  Logger,
  LoggerWithoutCallSite,
} from "../src";
import { doesLogContain } from "./helper";

let stdOut: string[] = [];
let stdErr: string[] = [];

const loggerConfig = {
  stdOut: {
    write: (print: string) => {
      stdOut.push(print);
    },
  },
  stdErr: {
    write: (print: string) => {
      stdErr.push(print);
    },
  },
};

const loggerPretty: Logger = new Logger({ ...loggerConfig, type: "pretty" });
const loggerJson: Logger = new Logger({ ...loggerConfig, type: "json" });
const loggerJsonWithoutCallsite: Logger = new LoggerWithoutCallSite({
  ...loggerConfig,
  type: "json",
});

class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestError";
  }
}

class TestErrorWithDetails extends TestError {
  private lines: number;
  constructor(message: string) {
    super(message);
    this.lines = 1234;
  }
}

describe("Logger: Error with and without details", () => {
  beforeEach(() => {
    stdOut = [];
    stdErr = [];
  });

  test("JSON: Check Error.toJSON()", (): void => {
    const error = new TestError("TestError");
    const errorToJson = JSON.stringify(error);

    expect(errorToJson.length).toBeGreaterThan(0);
  });

  test("Pretty: Error without details (stdErr)", (): void => {
    const error = new TestError("TestError");
    loggerPretty.warn(error);
    expect(doesLogContain(stdErr, "TestError")).toBeTruthy();
    expect(doesLogContain(stdErr, ".test.ts")).toBeTruthy();
    expect(doesLogContain(stdErr, "details:")).toBeFalsy();
  });

  test("Pretty: Error with details (stdErr)", (): void => {
    const error = new TestErrorWithDetails("TestError");
    loggerPretty.warn(error);
    expect(doesLogContain(stdErr, "TestError")).toBeTruthy();
    expect(doesLogContain(stdErr, ".test.ts")).toBeTruthy();
    expect(doesLogContain(stdErr, "details:")).toBeTruthy();
  });

  test("JSON: Error without details (stdErr)", (): void => {
    const error = new TestError("TestError");
    loggerJson.warn(error);
    expect(doesLogContain(stdErr, "TestError")).toBeTruthy();
    expect(doesLogContain(stdErr, ".test.ts")).toBeTruthy();
    expect(doesLogContain(stdErr, '"details":{}')).toBeTruthy();
  });

  test("JSON: Error with details (stdErr)", (): void => {
    const error = new TestErrorWithDetails("TestError");
    loggerJson.warn(error);
    expect(doesLogContain(stdErr, "TestError")).toBeTruthy();
    expect(doesLogContain(stdErr, ".test.ts")).toBeTruthy();
    expect(doesLogContain(stdErr, "details:")).toBeTruthy();
  });

  test("JSON: Check if call site wrapping is working (Bugfix: #29)", (): void => {
    try {
      let obj: any;
      const id = obj.id; // generating uncaught exception
    } catch (err) {
      loggerJson.error(err);
      const logObj: ILogObject = JSON.parse(stdErr[0]);
      const errorObj: IErrorObject = logObj.argumentsArray?.[0] as IErrorObject;

      expect(errorObj?.message).toContain("Cannot read propert");
      expect(errorObj?.message).toContain("'id'");

      expect(errorObj?.stack?.[0].fileName).toContain("error.test.ts");
    }
  });

  test("JSON: Check if logger works without callsite wrapper", (): void => {
    try {
      let obj: any;
      const id = obj.id; // generating uncaught exception
    } catch (err) {
      loggerJsonWithoutCallsite.error(err);
      const logObj: ILogObject = JSON.parse(stdErr[0]);
      const errorObj: IErrorObject = logObj.argumentsArray?.[0] as IErrorObject;

      expect(errorObj?.message).toContain("Cannot read propert");
      expect(errorObj?.message).toContain("'id'");

      expect(errorObj?.stack?.[0].fileName).toContain("error.test.ts");
    }
  });

  test("Helper: Print error", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, true);
    expect(errorObject).not.toBeNull();
    expect(stdOut).toHaveLength(0);
    expect(stdErr.length).toBeGreaterThan(0);
  });

  test("Helper: Don't print error", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, false);
    expect(errorObject).not.toBeNull();
    expect(stdOut).toHaveLength(0);
    expect(stdErr).toHaveLength(0);
  });

  test("Helper: Don't print error & code frame", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, false, true);
    expect(errorObject).not.toBeNull();
    expect(errorObject.codeFrame).not.toBeUndefined();
    expect(stdOut).toHaveLength(0);
    expect(stdErr).toHaveLength(0);
  });

  test("Helper: Don't print error & no code frame", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, false, false);
    expect(errorObject).not.toBeNull();
    expect(errorObject.codeFrame).toBeUndefined();
    expect(stdOut).toHaveLength(0);
    expect(stdErr).toHaveLength(0);
  });

  test("Helper: Print error & stack trace", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, true, false, true);
    expect(errorObject).not.toBeNull();
    expect(doesLogContain(stdErr, "error stack:")).toBeTruthy();
  });

  test("Helper: Print error & no stack trace", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(error, true, false, false);
    expect(errorObject).not.toBeNull();
    expect(doesLogContain(stdErr, "error stack:")).toBeFalsy();
  });

  test("Helper: Stack Trace offset: Infinity", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(
      error,
      false,
      false,
      false,
      Infinity
    );
    expect(errorObject).not.toBeNull();
    expect(errorObject.stack.length).toBe(0);
  });

  test("Helper: Stack Trace limit: 1", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(
      error,
      false,
      false,
      false,
      0,
      1
    );
    expect(errorObject).not.toBeNull();
    expect(errorObject.stack.length).toBe(1);
  });

  test("Helper: Stack Trace limit: 0", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(
      error,
      false,
      false,
      false,
      0,
      0
    );
    expect(errorObject).not.toBeNull();
    expect(errorObject.stack.length).toBe(0);
  });

  test("Helper: Stack Trace limit: -1", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(
      error,
      false,
      false,
      false,
      0,
      -1
    );
    expect(errorObject).not.toBeNull();
    expect(errorObject.stack.length).toBe(0);
  });

  test("Helper: Replace stdErr with stdOut", (): void => {
    const error = new TestError("TestError");
    const errorObject = loggerJson.prettyError(
      error,
      true,
      false,
      false,
      0,
      Infinity,
      {
        write: (print: string) => {
          stdOut.push(print);
        },
      }
    );
    expect(errorObject).not.toBeNull();
    expect(stdOut.length).toBeGreaterThan(0);
    expect(stdErr).toHaveLength(0);
  });
});
