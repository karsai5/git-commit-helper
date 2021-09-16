#!/usr/bin/env node

import { exit } from "process";
import { stringify } from "querystring";

const gitRootDir = require("git-root-dir");
const fs = require("fs");
const inquirer = require("inquirer");
const Validator = require("jsonschema").Validator;
const printMessage = require("print-message");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const v = new Validator();
const TEAM_MEMBERS_FILE = "team-members.json";
const GIT_TEMPLATE_HELPER_DIRECTORY = ".git-template-helper";
const CONFIG_FILE = GIT_TEMPLATE_HELPER_DIRECTORY + "/config.json";
const GIT_MESSAGE_FILE = GIT_TEMPLATE_HELPER_DIRECTORY + "/message.txt";

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

export type Paths = {
  gitRootDirectory: string;
  gitTemplateHelperDirectory: string;
  configFilePath: string;
  messageFilePath: string;
  teamMembersFilePath: string;
};

const saveConfig = (
  paths: Paths,
  prefix: string,
  teamMembers: Array<TeamMember>
) => {
  const config = {
    prefix,
    pairingWith: teamMembers.map((teamMember) => teamMember.email),
  };
  var configString = JSON.stringify(config, null, 2);
  fs.writeFileSync(paths.configFilePath, configString);
};

const generateCoAuthorSection = (teamMembers: Array<TeamMember>) => {
  return teamMembers
    .map(
      (teamMember) => `Co-authored-by: ${teamMember.name} <${teamMember.email}>`
    )
    .join("\n");
};

const requestDataFromUser = async (
  paths: Paths,
  config: ConfigFile | undefined
): Promise<{ commitPrefix: string; pairs: Array<TeamMember> }> => {
  let teamMembers: Array<TeamMember> = [];

  try {
    const rawData = fs.readFileSync(paths.teamMembersFilePath);
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

const getConfig = (paths: Paths): ConfigFile | undefined => {
  if (!fs.existsSync(paths.configFilePath)) {
    return undefined;
  }

  const rawData = fs.readFileSync(paths.configFilePath);
  return JSON.parse(rawData) as ConfigFile;
};

const generateCommitMessage = (commitPrefix: string) => {
  if (!commitPrefix || commitPrefix === "") {
    return "<Message>";
  }
  return `${commitPrefix} <Message>`;
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

const getPaths = async (): Promise<Paths> => {
  const gitRootDirectory = await gitRootDir(process.cwd());
  if (!gitRootDirectory) {
    console.log("Not in git repository");
    exit(1);
  }

  const gitTemplateHelperDirectory =
    gitRootDirectory + "/" + GIT_TEMPLATE_HELPER_DIRECTORY;
  const teamMembersFilePath = gitRootDirectory + "/" + TEAM_MEMBERS_FILE;
  const configFilePath = gitRootDirectory + "/" + CONFIG_FILE;
  const messageFilePath = gitRootDirectory + "/" + GIT_MESSAGE_FILE;

  if (!fs.existsSync(teamMembersFilePath)) {
    console.log(`Cannot find team members file: ${TEAM_MEMBERS_FILE}`);
    exit(1);
  }

  if (!fs.existsSync(gitTemplateHelperDirectory)) {
    await fs.promises.mkdir(gitTemplateHelperDirectory);
  }

  return {
    gitRootDirectory,
    gitTemplateHelperDirectory,
    teamMembersFilePath,
    configFilePath,
    messageFilePath,
  };
};

const saveGitMessage = (
  paths: Paths,
  commitPrefix: string,
  pairs: Array<TeamMember>
) => {
  const coAuthoredBy = generateCoAuthorSection(pairs);
  const commitMessage = generateCommitMessage(commitPrefix);

  const fullMessage = commitMessage + "\n\n" + coAuthoredBy;

  fs.writeFileSync(paths.messageFilePath, fullMessage);
  return fullMessage;
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
