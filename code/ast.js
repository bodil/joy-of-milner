const Id = (exports.Id = function Id(name) {
  return { type: "Id", name };
});

const Fun = (exports.Fun = function Fun(arg, body) {
  return { type: "Fun", arg: Id(arg), body };
});

const Call = (exports.Call = function Call(fun, arg) {
  return { type: "Call", fun, arg };
});

const If = (exports.If = function If(pred, yes, no) {
  return { type: "If", pred, yes, no };
});

const Let = (exports.Let = function Let(left, right, body) {
  return { type: "Let", left: Id(left), right, body };
});

const printAst = (exports.printAst = function printAst(node) {
  switch (node.type) {
    case "Id": {
      return node.name;
    }
    case "Call": {
      return `${printAst(node.fun)}(${printAst(node.arg)})`;
    }
    case "Fun": {
      return `fun(${printAst(node.arg)}) ${printAst(node.body)}`;
    }
    case "If": {
      return `if ${printAst(node.pred)} then ${printAst(
        node.yes
      )} else ${printAst(node.no)}`;
    }
    case "Let": {
      return `let ${printAst(node.left)} = ${printAst(
        node.right
      )} in ${printAst(node.body)}`;
    }
    default:
      return "UNKNOWN AST";
  }
});
