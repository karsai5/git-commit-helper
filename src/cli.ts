#!/usr/bin/env node

import { exit } from "process";
import { getConfig, saveConfig } from "./config";
import { getPaths } from "./files";
import { saveGitMessage } from "./gitTemplate";
import { requestDataFromUser } from "./input";

const inquirer = require("inquirer");
const printMessage = require("print-message");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

export type TeamMember = {
  name: string;
  email: string;
};

export type ConfigFile = {
  prefix: string;
  pairingWith: Array<string>;
};

export type Paths = {
  gitRootDirectory: string;
  gitTemplateHelperDirectory: string;
  configFilePath: string;
  messageFilePath: string;
  teamMembersFilePath: string;
};

const setGitConfig = async (paths: Paths) => {
  try {
    const currentTemplatePath = await exec("git config --get commit.template");
    if (!currentTemplatePath.stdout.includes(paths.messageFilePath)) {
      throw new Error("Current git template is wrong");
    }
  } catch {
    const result = await inquirer.prompt([
      {
        type: "confirm",
        name: "setTemplateDirectory",
        message:
          "Would you like to update git template to use the newly generate message?",
      },
    ]);
    if (result.setTemplateDirectory) {
      await exec(`git config commit.template ${paths.messageFilePath}`);
    }
  }
};

const main = async () => {
  const paths = await getPaths();

  const config = getConfig(paths);

  const { commitPrefix, pairs } = await requestDataFromUser(paths, config);

  saveConfig(paths, commitPrefix, pairs);

  const fullMessage = saveGitMessage(paths, commitPrefix, pairs);

  console.log("\nHere's your new commit template:");
  printMessage(fullMessage.split("\n"));
  console.log("Happy coding!");

  await setGitConfig(paths);

  exit(0);
};

main();
