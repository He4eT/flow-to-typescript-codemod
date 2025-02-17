import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { types } from "recast";
import { TransformerInput } from "./transformer";

const flowComments = [
  "@flow strict-local",
  "@flow strict",
  "@flow",
  "$FlowFixMe",
  "$FlowIssue",
  "$FlowExpectedError",
  "$FlowIgnore",
];

/**
 * Scan through top level programs, or code blocks and remove Flow-specific comments
 */
const removeComments = (
  path: NodePath<t.Program> | NodePath<t.BlockStatement>
) => {
  if (path.node.body.length === 0) {
    return;
  }

  const nodes: Array<types.namedTypes.Node> = path.node.body;

  for (const rootNode of nodes) {
    const { comments } = rootNode;

    rootNode.comments =
      comments
        ?.map((comment) => {
          if (flowComments.some((c) => comment.value.includes(c))) {
            let value = comment.value.split('\n')
              .filter(line =>
                !(flowComments.some(comment => line.includes(comment))))
              .filter(line =>
                !(/^\s*\*\s*$/.test(line)))
              .join('\n')

            return {
              ...comment,
              value: value.trim()
                ? value.replace(/^/, '*\n')
                : value
            }
          } else {
            return comment
          }
        })
        .filter((comment) => comment.value.length > 0)
        .map((comment) => {
          if (comment.value.includes("@noflow")) {
            return {
              ...comment,
              value: comment.value.replace(/@noflow/, "@ts-nocheck"),
            };
          }

          return comment;
        }) || rootNode.comments;
  }
};

/**
 * Search the top level program, and blocks like functions and if statements for comments
 */
export function removeFlowComments({ file }: TransformerInput) {
  traverse(file, {
    Program(path) {
      removeComments(path);
    },
    BlockStatement(path) {
      removeComments(path);
    },
  });
}
