import { ConfigFile, Paths, TeamMember } from "./cli";
const fs = require("fs");

export const getConfig = (paths: Paths): ConfigFile | undefined => {
  if (!fs.existsSync(paths.configFilePath)) {
    return undefined;
  }

  const rawData = fs.readFileSync(paths.configFilePath);
  return JSON.parse(rawData) as ConfigFile;
};

export const saveConfig = (
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
