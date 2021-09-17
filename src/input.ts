import { ConfigFile, Paths, TeamMember } from "./cli";
import { getTeamMembers } from "./files";
const inquirer = require("inquirer");
const Validator = require("jsonschema").Validator;

const v = new Validator();

export const requestDataFromUser = async (
  paths: Paths,
  config: ConfigFile | undefined
): Promise<{ commitPrefix: string; pairs: Array<TeamMember> }> => {
  let teamMembers: Array<TeamMember> = getTeamMembers(paths);

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
