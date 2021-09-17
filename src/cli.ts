#!/usr/bin/env node

import { exit } from "process";
import { getConfig, saveConfig } from "./config";
import { getPaths } from "./files";
import { saveGitMessage } from "./gitTemplate";
import { requestCommitPrefixFromUser, requestPairsFromUser } from "./input";
import chalk from "chalk";

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

const getNameFromGit = async () => {
  try {
    const name = await exec("git config --get user.name");
    return name.stdout.split(" ")[0];
  } catch (error: any) {
    console.log(error);
    return "there";
  }
};

const main = async () => {
  const paths = await getPaths();

  const config = getConfig(paths);

  const name = await getNameFromGit();
  console.log(chalk.bold(`Hi ${name}!`));
  if (config) {
    console.log(`Let's setup your git template...`);
  } else {
    console.log(
      `Looks like you haven't used ${chalk.underline(
        "git-template-helper"
      )} before, this cli utility helps create and update your git template message.`
    );
  }

  const commitPrefix = await requestCommitPrefixFromUser(config);
  const pairs = await requestPairsFromUser(paths, config);

  saveConfig(paths, commitPrefix, pairs);

  const fullMessage = saveGitMessage(paths, commitPrefix, pairs);

  console.log("\nHere's your new commit template:");
  printMessage(fullMessage.split("\n"));
  console.log("Happy coding!");

  await setGitConfig(paths);

  exit(0);
};

main();
