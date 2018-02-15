import Pink from "pink";
import "pink/css/themes/simon.less";
import "pink/node_modules/highlight.js/styles/github-gist.css";
import background from "pink/modules/background";
import image from "pink/modules/image";
import repl from "pink-repl";
import ts from "./repl";

new Pink("#slides", {
  background,
  image,
  repl: repl({ ts })
});
