const { Id, Fun, Call, If, Let, printAst } = require("./ast");
exports.Id = Id;
exports.Fun = Fun;
exports.Call = Call;
exports.If = If;
exports.Let = Let;
exports.printAst = printAst;

const { parse } = require("./parser");
exports.parse = parse;
