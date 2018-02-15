const p = require("eulalie");
const { Id, Fun, Call, Let, If, print } = require("./ast");

const RESERVED = ["let", "in", "rec", "if", "then", "else", "fun"];

function spaced(parser) {
  return p.seq(function*() {
    yield p.spaces;
    const { value } = yield parser;
    yield p.spaces;
    return value;
  });
}

const ide = p.seq(function*() {
  const { value, start } = yield p.many1(p.alphanum);
  if (RESERVED.includes(value)) {
    yield p.failAt(start);
  }
  return Id(value);
});

const ideOrCall = p.seq(function*() {
  const { value } = yield ide;
  const { value: call } = yield p.manyA(
    p.cut(p.str([p.spaces, p.string("(")]), function*() {
      yield p.spaces;
      const { value } = yield exp;
      yield p.spaces;
      yield p.string(")");
      return value;
    })
  );
  if (call.length > 0) {
    let out = Call(value, call[0]);
    for (const next of call.slice(1)) {
      out = Call(out, next);
    }
    return out;
  } else {
    return value;
  }
});

const callNoIde = p.seq(function*() {
  const { value: fn } = yield p.either([fun, ifElse, bind, group]);
  yield p.spaces;
  const { value: arg } = yield p.cut(p.string("("), function*() {
    yield p.spaces;
    const { value } = yield exp;
    yield p.spaces;
    yield p.string(")");
    return value;
  });
  return Call(fn, arg);
});

const ifElse = p.cut(p.string("if"), function*() {
  yield p.spaces1;
  const { value: pred } = yield exp;
  yield p.spaces1;
  yield p.string("then");
  yield p.spaces1;
  const { value: yes } = yield exp;
  yield p.spaces1;
  yield p.string("else");
  yield p.spaces1;
  const { value: no } = yield exp;
  return If(pred, yes, no);
});

const fun = p.cut(p.string("fun"), function*() {
  yield p.spaces;
  yield p.string("(");
  yield p.spaces;
  const { value: arg } = yield ide;
  yield p.spaces;
  yield p.string(")");
  yield p.spaces;
  const { value: body } = yield exp;
  return Fun(arg.name, body);
});

const bind = p.cut(p.string("let"), function*() {
  yield p.spaces1;
  const { value: left } = yield ide;
  yield p.spaces1;
  yield p.string("=");
  yield p.spaces1;
  const { value: right } = yield exp;
  yield p.spaces1;
  yield p.string("in");
  yield p.spaces1;
  const { value: body } = yield exp;
  return Let(left.name, right, body);
});

const group = p.cut(p.string("("), function*() {
  yield p.spaces;
  const { value: body } = yield exp;
  yield p.spaces;
  yield p.string(")");
  return body;
});

const exp = p.either([ifElse, ideOrCall, callNoIde, fun, bind, group]);

const parse = (exports.parse = p.makeParser(
  p.seq(function*() {
    yield p.spaces;
    const { value } = yield exp;
    yield p.spaces;
    yield p.eof;
    return value;
  })
));

// function test() {
//   const program = `
//   let factorial =
//     fun(n)
//       if zero(n)
//       then 1
//       else times(n)(factorial(pred(n)))
//   in factorial(0)
//   `;

//   try {
//     let result = parse(program);
//     tap.same(result, {});
//   } catch (e) {
//     if (p.isError(e)) {
//       console.error(e.print());
//     } else {
//       console.error(e);
//     }
//     tap.ok(false);
//   }
// }
