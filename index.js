#!/usr/bin/env node

require("colors");
require("caporal");

const { prompt } = require("enquirer");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");

prompt([
  {
    name: "useTypeScript",
    type: "confirm",
    message: "Enable TypeScript?"
  },
  {
    name: "useReact",
    type: "confirm",
    message: "Is this a React base project?"
  }
])
  .then(configuration => {
    console.log(
      "\nConfiguration".green,
      JSON.stringify(configuration, null, 2)
    );

    const { useTypeScript, useReact } = configuration;

    const replacementFiles = [];
    const replacementQuestions = [];

    const contents_ESLintRCJS = {
      extends: [
        "eslint:recommended",
        useTypeScript && "plugin:@typescript-eslint/recommended",
        useReact && "react-app",
        "plugin:jsx-a11y/recommended",
        "prettier",
        useTypeScript && "prettier/@typescript-eslint",
        useReact && "prettier/react"
      ].filter(Boolean),
      plugins: [
        useTypeScript && "@typescript-eslint",
        "jsx-a11y",
        "prettier"
      ].filter(Boolean),
      ...(useTypeScript && { parser: "@typescript-eslint/parser" }),
      parserOptions: {
        ecmaFeatures: {},
        ecmaVersion: 2020,
        sourceType: "module"
      },
      env: {
        jest: true,
        browser: true,
        es6: true,
        mocha: true,
        node: true
      },
      rules: {
        "prettier/prettier": "error",
        ...(useTypeScript && {
          "@typescript-eslint/interface-name-prefix": [
            "error",
            { prefixWithI: "always" }
          ]
        }),
        ...(useTypeScript && {
          "@typescript-eslint/no-empty-interface": "warn"
        })
      }
    };

    replacementFiles.push({
      file: ".eslintrc.js",
      contents: `module.exports = ${JSON.stringify(
        contents_ESLintRCJS,
        null,
        2
      )}`
    });

    if (useTypeScript) {
      const contents_TSConfigJSON = {
        compilerOptions: {
          declaration: true,
          declarationDir: "./types",
          declarationMap: true,
          target: "esnext",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: false,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          module: "esnext",
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react",
          noFallthroughCasesInSwitch: true,
          noImplicitReturns: true,
          outDir: "./lib",
          removeComments: true,
          sourceMap: true
        },
        exclude: [
          "node_modules",
          "**/__tests__",
          "**/*.spec.js",
          "**/*.test.js",
          "**/__snapshots__"
        ],
        include: ["./src/**/*"]
      };

      replacementFiles.push({
        file: "tsconfig.json",
        contents: JSON.stringify(contents_TSConfigJSON, null, 2)
      });
    }

    const replacementDevDependencies = [
      useReact && ["@babel/cli", "7.7.4"],
      useReact && ["@babel/core", "7.7.4"],
      useReact && ["@babel/plugin-proposal-class-properties", "7.7.4"],
      useReact && ["@babel/plugin-proposal-decorators", "7.7.4"],
      useReact && ["@babel/plugin-transform-runtime", "7.7.4"],
      useReact && ["@babel/preset-env", "7.7.4"],
      useReact && useTypeScript && ["@babel/preset-typescript", "7.7.4"],
      useTypeScript && ["@typescript-eslint/eslint-plugin", "2.9.0"],
      useTypeScript && ["@typescript-eslint/parser", "2.9.0"],
      useReact && ["babel-plugin-macros", "2.7.1"],
      useReact &&
        useTypeScript && ["babel-plugin-typescript-to-proptypes", "1.1.0"],
      useReact && ["babel-preset-react-app", "9.0.2"],
      useTypeScript && ["dts-bundle", "0.7.3"],
      ["eslint", "6.7.1"],
      ["eslint-config-prettier", "6.7.0"],
      ["eslint-config-react-app", "5.0.2"],
      ["eslint-plugin-flowtype", "4.5.2"],
      ["eslint-plugin-import", "2.18.2"],
      ["eslint-plugin-jsx-a11y", "6.2.3"],
      ["eslint-plugin-prettier", "3.1.1"],
      ["eslint-plugin-react", "7.16.0"],
      ["eslint-plugin-react-hooks", "2.3.0"],
      ["husky", "3.1.0"],
      ["lint-staged", "9.5.0"],
      ["prettier", "1.19.1"],
      ["rimraf", "3.0.0"],
      useTypeScript && ["typescript", "3.7.2"]
    ].filter(Boolean);

    const contents_BableConfigJS = useReact
      ? `
${useTypeScript ? "// @ts-nocheck" : ""}
${
  useTypeScript
    ? "/* eslint-disable @typescript-eslint/explicit-function-return-type */"
    : ""
}
${
  useTypeScript ? "/* eslint-disable @typescript-eslint/no-var-requires */" : ""
}
const babelPresetReactApp = require('babel-preset-react-app');
${
  useTypeScript
    ? "const babelPluginTypeScriptToPropTypes = require('babel-plugin-typescript-to-proptypes');"
    : ""
}

const env = process.env.NODE_ENV || 'development';

process.env.NODE_ENV = env;

if (!['development', 'test', 'production'].includes(env)) {
  // set this just for create from babel preset
  process.env.BABEL_ENV = process.env.NODE_ENV = 'development';
}

module.exports = (api) => {
  api.cache(true);
  // use the default create from create-react-app but extend it for local use with our own webpack
  const config = babelPresetReactApp(api, {
    typescript: ${useTypeScript},
    helpers: false,
    absoluteRuntime: false
  });

  // add your own plugins
  ${
    useTypeScript
      ? "config.plugins.push(babelPluginTypeScriptToPropTypes);"
      : ""
  }

  // reset node_env for webpack and service
  process.env.NODE_ENV = env;

  return config;
};`
      : `
${useTypeScript ? "// @ts-nocheck" : ""}
${
  useTypeScript
    ? "/* eslint-disable @typescript-eslint/explicit-function-return-type */"
    : ""
}
${
  useTypeScript ? "/* eslint-disable @typescript-eslint/no-var-requires */" : ""
}
const env = process.env.NODE_ENV || 'development';

const isEnvDevelopment = env === 'development';
const isEnvProduction = env === 'production';
const isEnvTest = env === 'test';

const useESModules = isEnvDevelopment || isEnvProduction;
const isTypeScriptEnabled = ${useTypeScript};
const areHelpersEnabled = false;
const absoluteRuntimePath = undefined;

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      isEnvTest && [
        // ES features necessary for user's Node version
        require('@babel/preset-env').default,
        {
          targets: {
            node: 'current'
          }
        }
      ],
      (isEnvProduction || isEnvDevelopment) && [
        require('@babel/preset-env').default,
        {
          useBuiltIns: 'entry',
          corejs: 3,
          modules: false,
          exclude: ['transform-typeof-symbol']
        }
      ],
      isTypeScriptEnabled && [require('@babel/preset-typescript').default]
    ].filter(Boolean),
    plugins: [
      require('babel-plugin-macros'),
      [
        require('@babel/plugin-transform-destructuring').default,
        {
          loose: false
        }
      ],
      isTypeScriptEnabled && [require('@babel/plugin-proposal-decorators').default, false],
      [
        require('@babel/plugin-proposal-class-properties').default,
        {
          loose: true
        }
      ],
      [
        require('@babel/plugin-proposal-object-rest-spread').default,
        {
          useBuiltIns: true
        }
      ],
      [
        require('@babel/plugin-transform-runtime').default,
        {
          corejs: false,
          helpers: areHelpersEnabled,
          regenerator: true,
          useESModules,
          absoluteRuntime: absoluteRuntimePath
        }
      ],
      isTypeScriptEnabled && require('babel-plugin-typescript-to-proptypes'),
      require('@babel/plugin-syntax-dynamic-import').default,
      isEnvTest && require('babel-plugin-dynamic-import-node')
    ].filter(Boolean),
    overrides: [
      isTypeScriptEnabled && {
        test: /\\.tsx?$/,
        plugins: [[require('@babel/plugin-proposal-decorators').default, { legacy: true }]]
      }
    ].filter(Boolean)
  };
};`;

    replacementFiles.push({
      file: "babel.config.js",
      contents: contents_BableConfigJS
    });

    const appDirectory = process.cwd();

    replacementFiles.forEach(({ file, contents }) => {
      fs.writeFileSync(path.join(appDirectory, file), contents, {
        encoding: "utf8"
      });
    });

    if (!fs.existsSync(path.join(appDirectory, "package.json"))) {
      shell.exec(`cd ${appDirectory} && npm init -y`);
    }

    const packages = replacementDevDependencies.map(item => {
      if (Array.isArray(item)) {
        return item.join("@");
      }
      return item;
    });
    shell.exec(`cd ${appDirectory} && yarn add ${packages.join(" ")} -D`);
  })
  .catch(console.error);
