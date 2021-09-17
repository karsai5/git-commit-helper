const fs = require("fs");
import { exit } from "process";
import { Paths, TeamMember } from "./cli";
const gitRootDir = require("git-root-dir");
const Validator = require("jsonschema").Validator;
const v = new Validator();

const TEAM_MEMBERS_FILE = "team-members.json";
const GIT_TEMPLATE_HELPER_DIRECTORY = ".git-template-helper";
const CONFIG_FILE = GIT_TEMPLATE_HELPER_DIRECTORY + "/config.json";
const GIT_MESSAGE_FILE = GIT_TEMPLATE_HELPER_DIRECTORY + "/message.txt";

export const getPaths = async (): Promise<Paths> => {
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

export const getTeamMembers = (paths: Paths) => {
  let teamMembers: Array<TeamMember> = [];

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
  return teamMembers;
};
