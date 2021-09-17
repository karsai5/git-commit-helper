import chalk from "chalk";
import { ConfigFile, Paths, TeamMember } from "./cli";
import { getTeamMembers } from "./files";
const inquirer = require("inquirer");
var readline = require("readline");

export const requestCommitPrefixFromUser = async (
  config: ConfigFile | undefined
): Promise<string> => {
  const result = await new Promise<string>((resolve) => {
    const rl = readline.createInterface(process.stdin, process.stdout);
    rl.question(
      `${chalk.green("?")} ${chalk.bold(
        "What would you like your commit prefix to be: "
      )}`,
      function (answer: string) {
        resolve(answer);
      }
    );
    rl.write(config?.prefix);
  });
  return result.trim();
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
