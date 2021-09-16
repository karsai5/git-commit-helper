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

const TEAM_MEMBERS_FILE = "team-members.json";
const CONFIG_FILE = ".git-commit-helper.json";

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

const showlistOfPairs = async (
  gitRootDirectory: string,
  config: ConfigFile | undefined
): Promise<Array<TeamMember>> => {
  const teamMembersFilePath = gitRootDirectory + "/" + TEAM_MEMBERS_FILE;
  if (!fs.existsSync(teamMembersFilePath)) {
    console.log(`Cannot file team members file: ${TEAM_MEMBERS_FILE}`);
    exit(1);
  }
  console.debug("Found team members file", teamMembersFilePath);

  let teamMembers: Array<TeamMember> = [];

  try {
    const rawData = fs.readFileSync(teamMembersFilePath);
    teamMembers = JSON.parse(rawData);
  } catch {
    console.log("Team members file seems to have invalid json");
  }

  const checks: Array<number> = [];

  const values = teamMembers.map((teamMember: any, index) => {
    if (config?.pairingWith.includes(teamMember.email)) {
      checks.push(index);
    }
    return `${teamMember.name} - ${teamMember.email}`;
  });

  const listResults = await list(values, { checks });
  return listResults.checks.map((index: number) => {
    return teamMembers[index];
  });
};

const getConfig = (gitRootDirectory: string): ConfigFile | undefined => {
  const configFilePath = gitRootDirectory + "/" + CONFIG_FILE;

  if (!fs.existsSync(configFilePath)) {
    console.debug(`Cannot config file`);
    return undefined;
  }

  const rawData = fs.readFileSync(configFilePath);
  return JSON.parse(rawData) as ConfigFile;
};

const main = async () => {
  console.log("Git Commit Helper");
  const gitRootDirectory = await gitRootDir(process.cwd());
  if (!gitRootDirectory) {
    console.log("Not in git repository");
    exit(1);
  }

  console.debug("Found git repository", gitRootDirectory);

  const config = getConfig(gitRootDirectory);

  const pairs = await showlistOfPairs(gitRootDirectory, config);

  const coAuthoredBy = generateCoAuthorSection(pairs);
  console.log(coAuthoredBy);
  saveConfig(gitRootDirectory, "testPrefix", pairs);
  exit(0);
};

main();
