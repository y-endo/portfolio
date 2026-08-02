import stylelint from "stylelint";

const pseudoNestingRuleName = "portfolio/selector-pseudo-nesting";
const pseudoNestingMessages = stylelint.utils.ruleMessages(
  pseudoNestingRuleName,
  {
    expected:
      "Expected state pseudo-classes and pseudo-elements to be nested under their base selector with &",
  },
);
const statePseudoPattern =
  /--[a-z0-9-]*(?:active|disabled|enabled|loading|open|ready|selected)\b|\.swiper-[a-z0-9-]*(?:active|disabled)\b|::(?:after|backdrop|before)|:(?:active|checked|disabled|enabled|focus(?:-visible|-within)?|hover|open|target|visited)\b/;

const pseudoNestingRule = (primaryOption) => (root, result) => {
  if (!primaryOption) {
    return;
  }

  root.walkRules((rule) => {
    if (!statePseudoPattern.test(rule.selector)) {
      return;
    }

    for (const selector of rule.selectors ?? []) {
      if (!statePseudoPattern.test(selector) || selector.includes("&")) {
        continue;
      }

      stylelint.utils.report({
        message: pseudoNestingMessages.expected,
        node: rule,
        result,
        ruleName: pseudoNestingRuleName,
      });
    }
  });
};

pseudoNestingRule.ruleName = pseudoNestingRuleName;
pseudoNestingRule.messages = pseudoNestingMessages;

const pseudoNestingPlugin = stylelint.createPlugin(
  pseudoNestingRuleName,
  pseudoNestingRule,
);

export default {
  extends: ["stylelint-config-standard-scss"],
  plugins: [pseudoNestingPlugin],
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    "at-rule-disallowed-list": ["media"],
    "declaration-property-unit-disallowed-list": {
      "/.*/": ["rem", "vw"],
    },
    "declaration-property-value-disallowed-list": {
      "/.*/": ["/(?:rem|vw-at-design)\\(\\s*-?\\d*\\.\\d+\\s*\\)/"],
      "font-size": ["/(?:^|[\\s,(])(?:\\d*\\.)?\\d+(?:px|rem)(?=$|[\\s,)])/"],
    },
    [pseudoNestingRuleName]: true,
    "selector-max-id": 0,
    "selector-class-pattern": [
      "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+-?)+)?(?:--(?:[a-z0-9]+-?)+)?$",
      {
        message: "Expected class selector to use BEM notation",
      },
    ],
  },
  overrides: [
    {
      files: ["src/styles/tools/_media.scss"],
      rules: {
        "at-rule-disallowed-list": null,
      },
    },
    {
      files: ["src/styles/tools/_functions.scss"],
      rules: {
        "declaration-property-unit-disallowed-list": null,
      },
    },
    {
      files: ["src/components/**/*.scss", "src/styles/pages/**/*.scss"],
      rules: {
        "selector-attribute-name-disallowed-list": ["/.*/"],
        "selector-max-type": 0,
        "selector-max-universal": 0,
        "selector-no-qualifying-type": true,
        "selector-pseudo-class-disallowed-list": [
          "first-child",
          "first-of-type",
          "last-child",
          "last-of-type",
          "nth-child",
          "nth-of-type",
          "only-child",
          "only-of-type",
        ],
      },
    },
  ],
};
