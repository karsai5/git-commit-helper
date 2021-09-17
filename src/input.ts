import { ConfigFile, Paths, TeamMember } from "./cli";
import { getTeamMembers } from "./files";
const inquirer = require("inquirer");
const Validator = require("jsonschema").Validator;

const v = new Validator();

export const requestCommitPrefixFromUser = async (
  config: ConfigFile | undefined
): Promise<string> => {
  const result = await inquirer.prompt([
    {
      type: "input",
      name: "commitPrefix",
      message: "Commit prefix",
      default() {
        return config?.prefix;
      },
    },
  ]);
  return result.commitPrefix;
};

export const requestPairsFromUser = async (
  paths: Paths,
  config: ConfigFile | undefined
): Promise<Array<TeamMember>> => {
  let teamMembers: Array<TeamMember> = getTeamMembers(paths);
  const result = await inquirer.prompt([
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
  return result.pairs;
};
