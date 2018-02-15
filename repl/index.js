import "brace/mode/typescript";

import * as ts from "typescript";
import EventEmitter from "eventemitter3";
import ReplWorker from "webworker!./worker.es3";

const libName = "lib.d.ts";
const libDTS = require("raw!typescript/lib/lib.d.ts");

const files = {
  [libName]: { version: 0, content: libDTS }
};

const tsOpts = {
  noImplicitAny: false,
  noEmitOnError: true,
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.System
};

// function compile(input, context = "", compilerOptions = tsOpts) {
//   const program = ts.createProgram(["repl.ts"], compilerOptions);
//   const res = program.emit();
//   console.log(res);
//   return { code: "", errors: [] };
// }

class ServiceHost {
  constructor() {
    this.files = files;
    this.insert(libName, libDTS);
  }

  insert(name, content) {
    const entry = this.files[name] || { version: 0 };
    entry.version++;
    entry.content = content;
    this.files[name] = entry;
  }

  getScriptFileNames() {
    return Object.keys(this.files);
  }

  getScriptVersion(name) {
    return this.files[name] && this.files[name].version.toString();
  }

  getScriptSnapshot(name) {
    return (
      this.files[name] && ts.ScriptSnapshot.fromString(this.files[name].content)
    );
  }

  getCompilationSettings() {
    return tsOpts;
  }

  getDefaultLibFileName() {
    return libName;
  }

  getCurrentDirectory() {
    return "";
  }

  fileExists(fileName) {
    return this.files.hasOwnProperty(fileName);
  }

  readFile() {
    throw new Error("TypeScript tried to readFile()");
  }
  readDirectory() {
    throw new Error("TypeScript tried to readDirectory()");
  }
}

// function compile(input, context = "", options = tsOpts) {
//   const code = `${context}${input}`;
//   const inputFileName = "repl.ts";
//   const sourceFile = ts.createSourceFile(inputFileName, code, options.target);
//   const libFile = ts.createSourceFile(libName, libDTS, options.target);
//   let outputText;

//   const program = ts.createProgram([inputFileName], options, compilerHost);
//   const res = program.emit();

//   const allDiagnostics = ts
//     .getPreEmitDiagnostics(program)
//     .concat(res.diagnostics);
//   const errors = allDiagnostics.map(diagnostic => {
//     // const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
//     const message = diagnostic.messageText;
//     if (diagnostic.start !== undefined) {
//       return { message, cursor: diagnostic.start - context.length, input };
//     }
//     return { message, input };
//   });

//   return { code: outputText, errors };
// }

const host = new ServiceHost();
const service = ts.createLanguageService(host, ts.createDocumentRegistry());

function compile(input, context = "") {
  const fileName = "repl.ts";
  host.insert(fileName, context + input);
  const output = service.getEmitOutput(fileName);

  const allDiagnostics = service
    .getCompilerOptionsDiagnostics()
    .concat(service.getSyntacticDiagnostics(fileName))
    .concat(service.getSemanticDiagnostics(fileName));

  const errors = allDiagnostics.map(diagnostic => {
    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    if (diagnostic.file) {
      // let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      //   diagnostic.start
      // );
      return {
        cursor: diagnostic.start - context.length,
        input,
        message: `${diagnostic.file.fileName}: ${message}`
      };
    } else {
      return { message, input };
    }
  });

  return {
    code: output.emitSkipped ? null : output.outputFiles[0].text,
    errors
  };
}

class TypeScriptREPL extends EventEmitter {
  constructor() {
    super();
    this.env = new ReplWorker();
    this.env.onmessage = e => this.onMessage(e.data);
    this.context = "";
  }

  cleanup() {
    this.removeAllListeners();
    this.env.terminate();
  }

  onMessage([msg, data]) {
    this.emit(msg, data);
  }

  eval(input) {
    const expand = input[0] === "&";
    const line = expand ? input.slice(1) : input;
    const res = compile(line, this.context);
    if (res.errors.length) {
      this.emit("compileError", res.errors);
    } else {
      this.env.postMessage({ eval: res.code, expand });
    }
  }

  load(input) {
    const res = compile(input);
    if (res.errors.length) {
      this.emit("compileError", res.errors);
    } else {
      this.context = input;
      this.env.postMessage({ load: res.code });
      this.emit("loaded");
    }
  }
}

export default {
  aceMode: "ace/mode/typescript",
  getContext: () => new TypeScriptREPL()
};
