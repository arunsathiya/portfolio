export type Project = {
  title: string;
  techs: string[];
  link: string;
  isComingSoon?: boolean;
};

const projects: Project[] = [
  {
    title: "1Password Shell Plugins",
    techs: ["Golang", "CLI", "1Password"],
    link: "https://github.com/1Password/shell-plugins",
  },
  {
    title: "GitHub CLI",
    techs: ["Golang", "CLI", "GitHub"],
    link: "https://github.com/cli/cli/",
  },
  {
    title: "WordPress.com Calypso",
    techs: ["JavaScript", "React", "Redux", "WordPress"],
    link: "https://github.com/Automattic/wp-calypso/",
  },
];

export default projects;
