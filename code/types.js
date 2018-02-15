const Var = (exports.Var = function Var(name) {
  return { type: "var", name };
});

const Op = (exports.Op = function Op(name, ...args) {
  return { type: "op", name, args };
});

const Function = (exports.Function = function Function(from, to) {
  return Op("→", from, to);
});

const Int = (exports.Int = Op("int"));

const Bool = (exports.Bool = Op("bool"));

const Pair = (exports.Pair = function Pair(left, right) {
  return Op("×", left, right);
});

const sameType = (exports.sameType = function sameType(t1, t2) {
  if (t1.type !== t2.type || t1.name !== t2.name) {
    return false;
  }
  if (t1.type === "op") {
    if (t1.args.length !== t2.args.length) {
      return false;
    }
    for (const i = 0; i < t1.args.length; i++) {
      if (!sameType(t1.args[i], t2.args[i])) {
        return false;
      }
    }
  }
  return true;
});
