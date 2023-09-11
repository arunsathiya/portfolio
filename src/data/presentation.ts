type Social = {
  label: string;
  link: string;
};

type Presentation = {
  mail: string;
  title: string;
  description: string;
  socials: Social[];
  profile?: string;
};

const presentation: Presentation = {
  mail: "arun@arun.blog",
  title: "Hi, I’m Arun 👋",
  // profile: "/profile.webp",
  description:
    "I am a new grad Go developer with prior experience in JavaScript development and occasional TypeScript work. I am looking for opportunities in Golang and Rust.",
  socials: [
    {
      label: "Twitter",
      link: "https://twitter.com/arunsathiya",
    },
    {
      label: "Github",
      link: "https://github.com/arunsathiya",
    },
  ],
};

export default presentation;
