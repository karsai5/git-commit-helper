import { Paths, TeamMember } from "./cli";
const fs = require("fs");

const generateCoAuthorSection = (teamMembers: Array<TeamMember>) => {
  return teamMembers
    .map(
      (teamMember) => `Co-authored-by: ${teamMember.name} <${teamMember.email}>`
    )
    .join("\n");
};
const generateTemplatePrefix = (commitPrefix: string) => {
  if (!commitPrefix || commitPrefix === "") {
    return "<Message>";
  }
  return `${commitPrefix} <Message>`;
};

export const saveGitMessage = (
  paths: Paths,
  commitPrefix: string,
  pairs: Array<TeamMember>
) => {
  const coAuthoredBy = generateCoAuthorSection(pairs);
  const gitTemplatePrefix = generateTemplatePrefix(commitPrefix);

  const fullMessage = gitTemplatePrefix + "\n\n" + coAuthoredBy;

  fs.writeFileSync(paths.messageFilePath, fullMessage);
  return fullMessage;
};
