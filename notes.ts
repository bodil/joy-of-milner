declare var Id: any;
declare var Fun: any;
declare var Call: any;
declare var If: any;
declare var Let: any;
declare var printAst: any;
declare var parse: any;

// Types

function Var(name) {
  return { type: "var", name };
}

function Op(name, ...args) {
  return { type: "op", name, args };
}

function Fn(from, to) {
  return Op("→", from, to);
}

const Int = Op("int");

const Bool = Op("bool");

function Pair(left, right) {
  return Op("×", left, right);
}

function sameType(t1, t2) {
  if (t1.type !== t2.type || t1.name !== t2.name) {
    return false;
  }
  if (t1.type === "op") {
    if (t1.args.length !== t2.args.length) {
      return false;
    }
    for (let i = 0; i < t1.args.length; i++) {
      if (!sameType(t1.args[i], t2.args[i])) {
        return false;
      }
    }
  }
  return true;
}

// Standard env

function stdenv() {
  let pairLeft = freshVar();
  let pairRight = freshVar();

  return {
    true: Bool,
    false: Bool,
    zero: Fn(Int, Bool),
    succ: Fn(Int, Int),
    pred: Fn(Int, Int),
    times: Fn(Int, Fn(Int, Int)),
    pair: Fn(pairLeft, Fn(pairRight, Pair(pairLeft, pairRight)))
  };
}

// Solver

function isInt(s) {
  return s.match(/^[0-9]+$/);
}

var nextVar = 1;

function freshVar() {
  let name = "" + nextVar;
  nextVar++;
  return Var(name);
}

function prune(type) {
  if (type.type == "var" && type.instance) {
    return prune(type.instance);
  }
  return type;
}

function occursInType(v, type) {
  let t = prune(type);
  if (sameType(v, t)) {
    return true;
  }
  if (t.type === "op") {
    return occursIn(v, t.args);
  }
  return false;
}

function occursIn(v, types) {
  for (let type of types) {
    if (occursInType(v, type)) {
      return true;
    }
  }
  return false;
}

function isGeneric(v, nongen) {
  return !occursIn(v, nongen);
}

function unify(type1, type2) {
  let t1 = prune(type1);
  let t2 = prune(type2);

  if (t1.type === "var") {
    if (!sameType(t1, t2)) {
      if (occursInType(t1, t2)) {
        throw new Error("recursive unification");
      }
      t1.instance = t2;
    }
  } else if (t2.type === "var") {
    unify(t2, t1);
  } else if (t1.type === "op" && t2.type === "op") {
    if (t1.name !== t2.name || t1.args.length !== t2.args.length) {
      throw new Error(`type mismatch: ${print(t1)} != ${print(t2)}`);
    }
    for (let i = 0; i < t1.args.length; i++) {
      unify(t1.args[i], t2.args[i]);
    }
  }
}

function fresh(type, nongen) {
  let mappings = {};
  function freshrec(type) {
    let t = prune(type);
    if (t.type === "var") {
      if (isGeneric(t, nongen)) {
        if (!mappings.hasOwnProperty(t.name)) {
          mappings[t.name] = freshVar();
        }
        return mappings[t.name];
      } else {
        return t;
      }
    } else if (t.type === "op") {
      return Op(t.name, ...t.args.map(freshrec));
    }
  }
  return freshrec(type);
}

function getType(name, env, nongen) {
  if (env.hasOwnProperty(name)) {
    return fresh(env[name], nongen);
  }
  if (isInt(name)) {
    return Int;
  }
  throw new Error(`undefined symbol ${name}`);
}

function analyse(ast, env, nongen = []) {
  switch (ast.type) {
    case "Id": {
      return getType(ast.name, env, nongen);
    }
    case "Call": {
      let funtype = analyse(ast.fun, env, nongen);
      let argtype = analyse(ast.arg, env, nongen);
      let restype = freshVar();
      unify(Fn(argtype, restype), funtype);
      return restype;
    }
    case "Fun": {
      let argtype = freshVar();
      let restype = analyse(ast.body, { ...env, [ast.arg.name]: argtype }, [
        ...nongen,
        argtype
      ]);
      return Fn(argtype, restype);
    }
    case "Let": {
      let newtype = freshVar();
      let newenv = { ...env, [ast.left.name]: newtype };
      let defntype = analyse(ast.right, newenv, [...nongen, newtype]);
      unify(newtype, defntype);
      return analyse(ast.body, newenv, nongen);
    }
    case "If": {
      let predtype = analyse(ast.pred, env, nongen);
      unify(predtype, Bool);
      let yestype = analyse(ast.yes, env, nongen);
      let notype = analyse(ast.no, env, nongen);
      unify(yestype, notype);
      return yestype;
    }
    default: {
      throw new Error(`unknown AST node "${ast.type}"`);
    }
  }
}

function print(type) {
  let next = "a".charCodeAt(0);

  function nextName() {
    return String.fromCharCode(next++);
  }

  let vars = {};

  function printType(type) {
    let t = prune(type);
    switch (t.type) {
      case "var": {
        if (vars.hasOwnProperty(t.name)) {
          return vars[t.name];
        } else {
          let name = nextName();
          vars[t.name] = name;
          return name;
        }
      }
      case "op": {
        if (t.args.length === 0) {
          return t.name;
        }
        if (t.args.length === 2) {
          return printType(t.args[0]) + " " + t.name + " " + printType(t.args[1]);
        }
        return t.name + " " + t.args.map(printType).join(" ");
      }
    }
  }

  return printType(type);
}

function check(code) {
  let type = analyse(parse(code), stdenv());
  return print(type);
}
