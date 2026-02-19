export type ModuleEntry = {
  path: string;
  request: string;
};

export type Manifest = {
  modules: Array<ModuleEntry>;
};
