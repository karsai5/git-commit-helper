#!/usr/bin/env node

import { exit } from "process";

const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");
const path = require("path");
const program = require("commander");
const gitRootDir = require("git-root-dir");
const fs = require("fs");
const cliSelect = require("cli-select");
const list = require("cli-list-select");
const inquirer = require("inquirer");
const Validator = require("jsonschema").Validator;
const printMessage = require("print-message");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const v = new Validator();
const TEAM_MEMBERS_FILE = "team-members.json";
const GIT_COMMIT_HELPER_DIRECTORY = ".git-commit-helper";
const CONFIG_FILE = GIT_COMMIT_HELPER_DIRECTORY + "/config.json";
const GIT_MESSAGE_FILE = GIT_COMMIT_HELPER_DIRECTORY + "/message.txt";
const JSON_SCHEMA_INSTANCE = 4;

const teamMembersSchema = {
  type: "array",
  items: {
    properties: {
      name: { type: "string" },
      email: { type: "string" },
    },
    required: ["name", "email"],
  },
};

type TeamMember = {
  name: string;
  email: string;
};

type ConfigFile = {
  prefix: string;
  pairingWith: Array<string>;
};

const saveConfig = (
  gitRootDirectory: string,
  prefix: string,
  teamMembers: Array<TeamMember>
) => {
  const config = {
    prefix,
    pairingWith: teamMembers.map((teamMember) => teamMember.email),
  };
  var configString = JSON.stringify(config, null, 2);
  fs.writeFileSync(`${gitRootDirectory}/${CONFIG_FILE}`, configString);
};

const generateCoAuthorSection = (teamMembers: Array<TeamMember>) => {
  return teamMembers
    .map(
      (teamMember) => `Co-authored-by: ${teamMember.name} <${teamMember.email}>`
    )
    .join("\n");
};

const requestDataFromUser = async (
  gitRootDirectory: string,
  config: ConfigFile | undefined
): Promise<{ commitPrefix: string; pairs: Array<TeamMember> }> => {
  const teamMembersFilePath = gitRootDirectory + "/" + TEAM_MEMBERS_FILE;
  if (!fs.existsSync(teamMembersFilePath)) {
    console.log(`Cannot find team members file: ${TEAM_MEMBERS_FILE}`);
    exit(1);
  }

  let teamMembers: Array<TeamMember> = [];

  try {
    const rawData = fs.readFileSync(teamMembersFilePath);
    teamMembers = JSON.parse(rawData);
    const validationResult = v.validate(teamMembers, teamMembersSchema);
    if (validationResult.errors.length > 0) {
      throw new Error("Invalid json");
    }
  } catch (error) {
    console.log("Team members file seems to have invalid json.");
    console.log("Expecting array of {name, email}");
    exit(1);
  }

  return inquirer.prompt([
    {
      type: "input",
      name: "commitPrefix",
      message: "Commit prefix",
      default() {
        return config?.prefix;
      },
    },
    {
      type: "checkbox",
      message: "Who are you pairing with",
      name: "pairs",
      choices: teamMembers.map((teamMember) => {
        return {
          name: `${teamMember.name} - ${teamMember.email}`,
          checked: config?.pairingWith.includes(teamMember.email),
          value: teamMember,
        };
      }),
    },
  ]);
};

const getConfig = (gitRootDirectory: string): ConfigFile | undefined => {
  const configFilePath = gitRootDirectory + "/" + CONFIG_FILE;

  if (!fs.existsSync(configFilePath)) {
    return undefined;
  }

  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData) as ConfigFile;
};

const generateCommitMessage = (commitPrefix: string) => {
  if (!commitPrefix || commitPrefix === "") {
    return "<Message>";
  }
  return `${commitPrefix} <Message>`;
};

const setGitConfig = async (path: string) => {
  try {
    const currentTemplatePath = await exec("git config --get commit.template");
    if (!currentTemplatePath.stdout.includes(path)) {
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
      await exec(`git config commit.template ${path}`);
    }
  }
};

const main = async () => {
  console.log("Git Commit Helper");
  const gitRootDirectory = await gitRootDir(process.cwd());
  const gitCommitHelperDirectory =
    gitRootDirectory + "/" + GIT_COMMIT_HELPER_DIRECTORY;
  if (!gitRootDirectory) {
    console.log("Not in git repository");
    exit(1);
  }

  const config = getConfig(gitRootDirectory);

  const { commitPrefix, pairs } = await requestDataFromUser(
    gitRootDirectory,
    config
  );

  if (!fs.existsSync(gitCommitHelperDirectory)) {
    await fs.promises.mkdir(gitCommitHelperDirectory);
  }

  saveConfig(gitRootDirectory, commitPrefix, pairs);

  const coAuthoredBy = generateCoAuthorSection(pairs);
  const commitMessage = generateCommitMessage(commitPrefix);

  const messagePath = `${gitRootDirectory}/${GIT_MESSAGE_FILE}`;
  const fullMessage = commitMessage + "\n\n" + coAuthoredBy;

  fs.writeFileSync(messagePath, fullMessage);

  console.log("\nHere's your new commit template:");
  printMessage(fullMessage.split("\n"));
  console.log("Happy coding!");

  await setGitConfig(messagePath);

  exit(0);
};

main();
