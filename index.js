#!/usr/bin/env node
// @ts-nocheck

require("colors");
require("caporal");

const { prompt } = require("enquirer");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");

const appDirectory = process.cwd();
const packagePath = path.join(appDirectory, "package.json");

let appName = path.basename(appDirectory);

if (fs.existsSync(packagePath)) {
  appName = require(packagePath).name || appName;
}

prompt([
  {
    name: "useTypeScript",
    type: "confirm",
    message: "TypeScript?"
  },
  {
    name: "useReact",
    type: "confirm",
    message: "React?"
  },
  {
    name: "useBabel",
    type: "confirm",
    message: "Babel?",
    initial: function() {
      if (this.enquirer.answers.useTypeScript) {
        return false;
      }
      if (this.enquirer.answers.useReact) {
        return true;
      }
      return false;
    },
    skip: function() {
      return (
        this.enquirer.answers.useTypeScript || this.enquirer.answers.useReact
      );
    }
  }
])
  .then(configuration => {
    console.log(
      "\nConfiguration".green,
      JSON.stringify(configuration, null, 2)
    );

    const { useTypeScript, useReact, useBabel } = configuration;

    const replacementFiles = [];

    const contents_ESLintRCJS = {
      extends: [
        "eslint:recommended",
        useTypeScript && "plugin:@typescript-eslint/recommended",
        useReact && "react-app",
        useReact && "plugin:jsx-a11y/recommended",
        "prettier",
        useTypeScript && "prettier/@typescript-eslint",
        useReact && "prettier/react"
      ].filter(Boolean),
      plugins: [
        useTypeScript && "@typescript-eslint",
        useReact && "jsx-a11y",
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
          allowJs: false,
          allowSyntheticDefaultImports: true,
          declaration: true,
          declarationDir: "./types",
          declarationMap: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          isolatedModules: true,
          jsx: "react",
          lib: ["DOM", "DOM.Iterable", "ESNext"],
          module: "ESNext",
          moduleResolution: "node",
          noEmit: true,
          noFallthroughCasesInSwitch: true,
          noImplicitReturns: true,
          outDir: "./lib",
          removeComments: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          sourceMap: true,
          strict: true,
          target: "ESNext"
        },
        exclude: [
          "node_modules",
          "**/__tests__",
          "**/*.spec.js",
          "**/*.test.js",
          "**/__snapshots__"
        ],
        include: ["./src/lib/**/*"]
      };

      replacementFiles.push({
        file: "tsconfig.json",
        contents: JSON.stringify(contents_TSConfigJSON, null, 2)
      });
    }

    const replacementDevDependencies = [
      ((useReact && !useTypeScript) || useBabel) && ["@babel/cli", "7.7.4"],
      !useReact && useBabel && ["@babel/core", "7.7.4"],
      !useReact &&
        useBabel && ["@babel/plugin-proposal-class-properties", "7.7.4"],
      !useReact && useBabel && ["@babel/plugin-proposal-decorators", "7.7.4"],
      !useReact && useBabel && ["@babel/plugin-transform-runtime", "7.7.4"],
      !useReact && useBabel && ["@babel/preset-env", "7.7.4"],
      useTypeScript && ["@typescript-eslint/eslint-plugin", "2.9.0"],
      useTypeScript && ["@typescript-eslint/parser", "2.9.0"],
      useReact && ["babel-eslint", "10.0.3"],
      !useReact && useBabel && ["babel-plugin-macros", "2.7.1"],
      useReact && !useTypeScript && ["babel-preset-react-app", "9.0.2"],
      useTypeScript && ["dts-bundle", "0.7.3"],
      ["eslint", "6.7.1"],
      ["eslint-config-prettier", "6.7.0"],
      useReact && ["eslint-config-react-app", "5.0.2"],
      useReact && ["eslint-plugin-flowtype", "4.5.2"],
      ["eslint-plugin-import", "2.18.2"],
      useReact && ["eslint-plugin-jsx-a11y", "6.2.3"],
      ["eslint-plugin-prettier", "3.1.1"],
      useReact && ["eslint-plugin-react", "7.16.0"],
      useReact && ["eslint-plugin-react-hooks", "2.3.0"],
      ["husky", "3.1.0"],
      ["lint-staged", "9.5.0"],
      ["prettier", "1.19.1"],
      ["rimraf", "3.0.0"],
      useTypeScript && ["typescript", "3.7.2"]
    ].filter(Boolean);

    if (useReact && !useTypeScript) {
      const contents_BableConfigJS = `
const babelPresetReactApp = require('babel-preset-react-app');

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
    typescript: false,
    helpers: false,
    absoluteRuntime: false
  });

  // handle multi-build types
  config.presets[0][1].modules = process.env.MODULES_ENV || config.presets[0][1].modules;

  // add your own plugins
  // config.plugins.push(x);

  // reset node_env for webpack and service
  process.env.NODE_ENV = env;

  return config;
};`;
      replacementFiles.push({
        file: "babel.config.js",
        contents: contents_BableConfigJS
      });
    } else {
      if (useBabel) {
        const contents_BableConfigJS = `
const env = process.env.NODE_ENV || 'development';

const isEnvDevelopment = env === 'development';
const isEnvProduction = env === 'production';
const isEnvTest = env === 'test';

const useESModules = isEnvDevelopment || isEnvProduction;

module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      isEnvTest && [
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
    ].filter(Boolean),
    plugins: [
      require('babel-plugin-macros'),
      [
        require('@babel/plugin-transform-destructuring').default,
        {
          loose: false
        }
      ],
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
          helpers: false,
          regenerator: true,
          useESModules
        }
      ],
      require('@babel/plugin-syntax-dynamic-import').default,
      isEnvTest && require('babel-plugin-dynamic-import-node')
    ].filter(Boolean),
  };
};`;
        replacementFiles.push({
          file: "babel.config.js",
          contents: contents_BableConfigJS
        });
      }
    }

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

    const packageString = packages.join(" ");

    if (fs.existsSync(path.join(appDirectory, "yarn.lock"))) {
      console.log(
        "Installing via Yarn".green,
        JSON.stringify(packages, null, 2)
      );
      shell.exec(`cd ${appDirectory} && yarn add ${packageString} -D`);
    } else {
      console.log(
        "Installing via NPM".green,
        JSON.stringify(packages, null, 2)
      );
      shell.exec(`cd ${appDirectory} && npm i ${packageString} -D`);
    }

    // now let's add build scripts and rename existing ones to be safe
    const existingPackage = require(packagePath);
    const scripts = existingPackage.scripts || {};
    const newPackage = {
      ...existingPackage,
      ...(useReact && {
        browserslist: {
          production: [">0.2%", "not dead", "not op_mini all"],
          development: [
            "last 1 chrome version",
            "last 1 firefox version",
            "last 1 safari version"
          ]
        }
      }),
      scripts: {
        ...scripts,
        lint: "eslint ./src",
        "lint:fix": "eslint ./src --fix",
        ...((useReact || useBabel) && {
          build:
            "NODE_ENV=production sh -c 'yarn build:clean && MODULES_ENV=commonjs yarn build:babel'",
          "build:clean": "rimraf lib",
          "build:babel":
            "babel src/lib -s -d lib --ignore **/__tests__,**/__mock__,**/__snapshots__,src/**/*.spec.js,src/**/*.test.js,src/**/*.stories.js,README.md"
        }),
        ...(useTypeScript && {
          lint: "eslint ./src --ext=ts,tsx",
          "lint:fix": "eslint ./src --ext=ts,tsx --fix",
          build: "rimraf lib && yarn build:ts && yarn build:types",
          "build:ts": "tsc --module commonjs --noEmit false",
          "build:types": `dts-bundle --name ${appName} --main types/index.d.ts --out ../lib/index.d.ts`
        })
      },
      husky: {
        hooks: {
          "pre-commit": "lint-staged"
        }
      },
      "lint-staged": {
        [`src/lib/**/*.{${useTypeScript ? "ts,tsx" : "js,jsx"}}`]: [
          "eslint --fix",
          "prettier --write",
          "git add"
        ]
      }
    };
    fs.writeFileSync(packagePath, JSON.stringify(newPackage, null, 2), {
      encoding: "utf8"
    });
  })
  .catch(console.error);
