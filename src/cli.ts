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
const CONFIG_FILE = ".git-commit-config.json";

type TeamMember = {
  name: string;
  email: string;
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

const main = async () => {
  console.log("Git Commit Helper");
  const gitRootDirectory = await gitRootDir(process.cwd());
  if (!gitRootDirectory) {
    console.log("Not in git repository");
    exit(1);
  }
  const teamMembersFilePath = gitRootDirectory + "/" + TEAM_MEMBERS_FILE;

  console.debug("Found git repository", gitRootDirectory);

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
  const values = teamMembers.map(
    (teamMeber: any) => `${teamMeber.name} - ${teamMeber.email}`
  );

  const listResults = await list(values);
  const pairs = listResults.checks.map((index: number) => {
    return teamMembers[index];
  });

  const coAuthoredBy = generateCoAuthorSection(pairs);
  console.log(coAuthoredBy);
  saveConfig(gitRootDirectory, "testPrefix", pairs);
  exit(0);
};

main();
